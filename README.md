# Optical 👁️  
🔵🔴🟡🔵🟢🔴🟡 (Google color scheme)

<p><em>Real-time AI that explains the physical world through your camera & microphone.</em></p>

---

## 🔵 Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run development server:
   ```bash
   npm run dev
   ```
3. Build for production:
   ```bash
   npm run build
   ```
4. Start the compiled server:
   ```bash
   npm start
   ```

🔵 Optical is a real-time multimodal AI agent that uses a device camera and
microphone to analyze the surrounding environment and explain objects,
systems, and diagrams interactively.

🔴 Users can point their camera at an object and ask questions like:
`What is this?`, `How does this work?`, `What parts am I looking at?`, or
`Teach me how to use this.`

> The goal is to make learning from the physical world as easy as asking a
> question.

---

## 🔴 Overview

🟡 Optical processes three inputs:
- 🔵 Camera frames
- 🔴 User voice input
- 🟡 Conversation context

The system produces:
- Object identification
- Visual scene understanding
- Context-aware explanations
- Interactive tutoring responses

---

## 🟡 System Architecture

`User Device (Camera + Microphone)` ➜ `Frontend (Next.js)` ➜
`Backend (Node.js WebSocket)` ➜ `AI Model (Multimodal)` ➜
`AI Response (Text + Voice)`

---

## 🟢 Core Features

1. **Object Recognition** – Detect visible objects in the camera feed and
   estimate category/components.
   *Example: Bicycle drivetrain → chain, crankset, cassette.*
2. **Scene Understanding** – Interpret the full scene and object
   relationships.
   *Example: Espresso machine → steam wand, portafilter, drip tray.*
3. **Voice Interaction** – Talk naturally: “What is this?”, “How does it
   work?”.
4. **Real-Time Explanation Engine** – Generate responses using visual
   context and conversation history.
   *Example: Pedaling rotates the crank, pulls the chain, turns rear
   wheel.*
5. **Interactive Learning Mode** – Optical quizzes users or simplifies
   content.
   *Example: “What part transfers motion from pedals to the wheel?”*
6. **Context Memory** – The agent remembers the current object over
time.

---

## 🔵 AI Agent Design

- **Visual Perception Module** – Receives camera frames and detects
  objects.
- **Scene Interpreter** – Determines primary object and domain.
- **Conversation Manager** – Tracks state: current object, previous
  questions, interaction mode.
- **Explanation Generator** – Crafts responses based on accumulated
  context.

---

## 🔴 AI Workflow

1. Capture camera frame
2. Capture microphone audio
3. Send input to backend
4. Backend forwards to AI model
5. Model analyzes image
6. Model interprets question
7. Model generates explanation
8. Response returned to frontend
9. UI displays explanation
10. Audio playback

---

## 🟡 User Interaction Flow

1. User opens Optical
2. Camera activates
3. User points camera at object
4. User asks question
5. Frame and audio sent to backend
6. AI processes scene
7. AI returns explanation
8. UI displays response

---

## 🟢 Technical Components

**Frontend** – Next.js, React, Tailwind, WebRTC, Web Audio API

**Backend** – Node.js, Express, WebSockets

**AI Layer** – Multimodal reasoning, scene interpretation,
explanation generation

---

## 🔵 Project Structure

```
optical/
  app/
    components/
      CameraView
      MicrophoneInput
      TranscriptPanel
      OverlayLabels
      ModeToggle

server/
  websocketServer
  ai/
    geminiSession
    agentController

lib/
  audio/
  vision/
  state/
```

---

## 🔴 Feature Implementation Plan

- 🔵 Phase 1 – camera capture, voice input, AI explanations
- 🔴 Phase 2 – real-time streaming, voice responses, object overlays
- 🟡 Phase 3 – quizzes, tutoring, multi-object understanding

---

## 🟡 Future Features

- 🔵 AR overlays for labeling object parts
- 🔴 Mechanical simulations
- 🟡 Collaborative learning
- 🟢 Persistent memory

---

## 🟢 License

MIT License

