import { WebSocketServer, WebSocket } from 'ws';
import { createLiveSession } from '../services/agent/ramseyBotService';
import { getSession } from '../services/cookingSessionService';
import {
  generateStepIllustration,
  generateClarifyIllustration,
} from '../services/vision/illustrationService';
import type { Recipe } from '../../types/recipe';
import type { IllustrationResult } from '../../types/illustration';
import type {
  CookingLiveClientMessage,
  CookingLiveServerMessage,
  GeminiLiveMessage,
  ActiveCookingSession,
} from '../../types/websocket';

// Map cookingSessionId -> { geminiSession, clientSocket, currentStepIndex, recipe }
const activeSessions = new Map<string, ActiveCookingSession>();

/**
 * Pre-fetch the next step's illustration in the background (cache-only, no WS message).
 */
const prefetchNextStep = (cookingSessionId: string, currentStepIndex: number, recipe: Recipe): void => {
  const nextIndex = currentStepIndex + 1;
  if (nextIndex >= recipe.instructions.length) return;
  const nextStepText = recipe.instructions[nextIndex];
  const cacheKey = `${cookingSessionId}:${nextIndex}`;
  generateStepIllustration(nextStepText, cacheKey).catch(() => {});
};

const sendJson = (socket: WebSocket, payload: CookingLiveServerMessage): void => {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
};

const sendBinary = (socket: WebSocket, data: Buffer): void => {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(data);
  }
};

const handleToolCall = async (entry: ActiveCookingSession, message: GeminiLiveMessage): Promise<void> => {
  const toolCall = message.toolCall;
  if (!toolCall?.functionCalls) return;

  for (const call of toolCall.functionCalls) {
    if (call.name === 'generate_illustration') {
      const description = call.args?.description as string | undefined;
      if (!description) continue;

      console.log('[RamseyBot] Tool call: generate_illustration -', description);
      sendJson(entry.clientSocket, { type: 'live:illustration_loading', context: 'clarify' });

      try {
        const result = await generateClarifyIllustration(description);
        if (result) {
          sendJson(entry.clientSocket, {
            type: 'live:illustration',
            context: 'clarify',
            image: result.data,
            format: result.format,
            alt: description,
          });
        } else {
          sendJson(entry.clientSocket, {
            type: 'live:illustration_error',
            context: 'clarify',
            error: 'Failed to generate illustration',
          });
        }
      } catch (err) {
        console.error('[RamseyBot] Clarify illustration error:', (err as Error).message);
        sendJson(entry.clientSocket, {
          type: 'live:illustration_error',
          context: 'clarify',
          error: 'Failed to generate illustration',
        });
      }

      // Send tool response back to Gemini so it can continue
      try {
        (entry.geminiSession as any).sendToolResponse({
          functionResponses: [
            {
              id: call.id,
              name: call.name,
              response: { success: true, message: 'Illustration generated and shown to the user.' },
            },
          ],
        });
      } catch (_err) {
        // Ignore if session closed
      }
    }
  }
};

const handleGeminiMessage = (entry: ActiveCookingSession, message: GeminiLiveMessage): void => {
  const clientSocket = entry.clientSocket;
  const serverContent = message.serverContent;

  // Handle tool calls from the model
  if (message.toolCall) {
    handleToolCall(entry, message).catch((err) => {
      console.error('[RamseyBot] Unhandled tool call error:', (err as Error).message);
    });
  }

  if (serverContent) {
    // Handle transcription events
    if (serverContent.inputTranscription && serverContent.inputTranscription.text) {
      sendJson(clientSocket, {
        type: 'live:transcript',
        role: 'user',
        text: serverContent.inputTranscription.text,
      });
    }

    if (serverContent.outputTranscription && serverContent.outputTranscription.text) {
      sendJson(clientSocket, {
        type: 'live:transcript',
        role: 'model',
        text: serverContent.outputTranscription.text,
      });
    }

    // Handle audio output
    if (serverContent.modelTurn && serverContent.modelTurn.parts) {
      for (const part of serverContent.modelTurn.parts) {
        if (part.inlineData && part.inlineData.data) {
          const audioBytes = Buffer.from(part.inlineData.data, 'base64');
          console.log(`[RamseyBot] Forwarding audio chunk: ${audioBytes.length} bytes`);
          sendBinary(clientSocket, audioBytes);
        }
      }
    } else if (serverContent.modelTurn) {
      console.log('[RamseyBot] modelTurn received but no inlineData parts:', JSON.stringify(serverContent.modelTurn).slice(0, 200));
    }

    // Handle turn completion
    if (serverContent.turnComplete) {
      sendJson(clientSocket, { type: 'live:turn_complete' });
    }
  }
};

const cleanupSession = (cookingSessionId: string): void => {
  const entry = activeSessions.get(cookingSessionId);
  if (entry) {
    try {
      (entry.geminiSession as any).close();
    } catch (_error) {
      // Session may already be closed
    }
    activeSessions.delete(cookingSessionId);
  }
};

export const setupCookingLiveServer = (): WebSocketServer => {
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (socket: WebSocket) => {
    let currentCookingSessionId: string | null = null;

    socket.on('message', async (rawMessage: Buffer, isBinary: boolean) => {
      // Binary messages are raw PCM audio from the client mic
      if (isBinary) {
        const entry = activeSessions.get(currentCookingSessionId!);
        if (entry && entry.geminiSession) {
          try {
            const audioData = rawMessage.toString('base64');
            (entry.geminiSession as any).sendRealtimeInput({
              media: {
                data: audioData,
                mimeType: 'audio/pcm;rate=16000',
              },
            });
          } catch (_error) {
            // Ignore send errors for audio chunks
          }
        }
        return;
      }

      // Text messages are JSON control messages
      let message: CookingLiveClientMessage;
      try {
        message = JSON.parse(rawMessage.toString());
      } catch (_error) {
        sendJson(socket, { type: 'live:error', error: 'Invalid message format' });
        return;
      }

      const { type } = message;

      if (type === 'live:start') {
        const { cookingSessionId } = message;
        if (!cookingSessionId) {
          sendJson(socket, { type: 'live:error', error: 'cookingSessionId is required' });
          return;
        }

        const cookingSession = getSession(cookingSessionId);
        if (!cookingSession) {
          sendJson(socket, { type: 'live:error', error: 'Cooking session not found' });
          return;
        }

        // Clean up any existing session for this cooking session
        if (currentCookingSessionId) {
          cleanupSession(currentCookingSessionId);
        }

        currentCookingSessionId = cookingSessionId;

        try {
          const geminiSession = await createLiveSession(
            cookingSession.recipe,
            cookingSession.currentStepIndex,
            {
              onReady: () => {
                console.log('[RamseyBot] Gemini session ready');
                sendJson(socket, { type: 'live:ready' });
              },
              onMessage: (geminiMessage) => {
                const keys = Object.keys(geminiMessage).filter(k => (geminiMessage as Record<string, unknown>)[k] != null);
                console.log('[RamseyBot] Gemini message keys:', keys.join(', '));
                const entry = activeSessions.get(cookingSessionId);
                if (entry) {
                  handleGeminiMessage(entry, geminiMessage);
                }
              },
              onError: (error) => {
                console.error('[RamseyBot] Gemini error:', error?.message || error);
                sendJson(socket, {
                  type: 'live:error',
                  error: error?.message || 'Gemini Live API error',
                });
              },
              onClose: () => {
                console.log('[RamseyBot] Gemini session closed');
                activeSessions.delete(cookingSessionId);
              },
            }
          );

          activeSessions.set(cookingSessionId, {
            geminiSession,
            clientSocket: socket,
            currentStepIndex: cookingSession.currentStepIndex,
            recipe: cookingSession.recipe,
          });

          // Trigger initial greeting and step reading
          try {
            (geminiSession as any).sendClientContent({
              turns: [{
                role: 'user',
                parts: [{ text: 'Hello! Please greet me and read the current step aloud.' }],
              }],
              turnComplete: true,
            });
          } catch (_error) {
            // Ignore if session not ready
          }

          // Generate illustration for the initial step
          const initialStepText =
            cookingSession.recipe.instructions[cookingSession.currentStepIndex];
          if (initialStepText) {
            const cacheKey = `${cookingSessionId}:${cookingSession.currentStepIndex}`;
            sendJson(socket, { type: 'live:illustration_loading', context: 'step' });
            generateStepIllustration(initialStepText, cacheKey)
              .then((result) => {
                if (result) {
                  const entry = activeSessions.get(cookingSessionId);
                  // Only send if step hasn't changed
                  if (entry && entry.currentStepIndex === cookingSession.currentStepIndex) {
                    sendJson(socket, {
                      type: 'live:illustration',
                      context: 'step',
                      image: result.data,
                      format: result.format,
                      alt: initialStepText,
                    });
                  }
                }
                // Pre-fetch next step illustration
                prefetchNextStep(cookingSessionId, cookingSession.currentStepIndex, cookingSession.recipe);
              })
              .catch((err) => {
                console.error('[RamseyBot] Initial illustration error:', (err as Error).message);
              });
          }
        } catch (error) {
          sendJson(socket, {
            type: 'live:error',
            error: (error as Error)?.message || 'Failed to connect to Gemini Live API',
          });
        }
        return;
      }

      if (type === 'live:video') {
        const entry = activeSessions.get(currentCookingSessionId!);
        if (entry && entry.geminiSession && message.image) {
          try {
            // Strip data URL prefix if present
            const base64Data = message.image.replace(/^data:image\/jpeg;base64,/, '');
            (entry.geminiSession as any).sendRealtimeInput({
              media: {
                data: base64Data,
                mimeType: 'image/jpeg',
              },
            });
          } catch (_error) {
            // Ignore send errors for video frames
          }
        }
        return;
      }

      if (type === 'live:stop') {
        if (currentCookingSessionId) {
          cleanupSession(currentCookingSessionId);
          currentCookingSessionId = null;
        }
        return;
      }
    });

    socket.on('close', () => {
      if (currentCookingSessionId) {
        cleanupSession(currentCookingSessionId);
        currentCookingSessionId = null;
      }
    });

    socket.on('error', () => {
      if (currentCookingSessionId) {
        cleanupSession(currentCookingSessionId);
        currentCookingSessionId = null;
      }
    });
  });

  return wss;
};

export const notifyStepChange = (cookingSessionId: string, stepIndex: number, stepText: string): void => {
  const entry = activeSessions.get(cookingSessionId);
  if (entry && entry.geminiSession) {
    // Update the tracked step index
    entry.currentStepIndex = stepIndex;

    // Tell Gemini to read the new step
    try {
      (entry.geminiSession as any).sendClientContent({
        turns: [
          {
            role: 'user',
            parts: [
              {
                text: `The user has moved to Step ${stepIndex + 1}: ${stepText}. Please read this step aloud and guide them.`,
              },
            ],
          },
        ],
        turnComplete: true,
      });
    } catch (_error) {
      // Ignore if session is closed
    }

    // Generate illustration for the new step (async, non-blocking)
    const cacheKey = `${cookingSessionId}:${stepIndex}`;
    sendJson(entry.clientSocket, { type: 'live:illustration_loading', context: 'step' });
    generateStepIllustration(stepText, cacheKey)
      .then((result) => {
        if (result) {
          // Only send if step hasn't changed since we started generating
          if (entry.currentStepIndex === stepIndex) {
            sendJson(entry.clientSocket, {
              type: 'live:illustration',
              context: 'step',
              image: result.data,
              format: result.format,
              alt: stepText,
            });
          }
        }
        // Pre-fetch next step illustration
        if (entry.recipe) {
          prefetchNextStep(cookingSessionId, stepIndex, entry.recipe);
        }
      })
      .catch((err) => {
        console.error('[RamseyBot] Step illustration error:', (err as Error).message);
        sendJson(entry.clientSocket, {
          type: 'live:illustration_error',
          context: 'step',
          error: 'Failed to generate illustration',
        });
      });
  }
};
