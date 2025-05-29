"use client"

import { useState, useEffect } from "react"
import { Button } from "./components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card"
import { Input } from "./components/ui/input"
import { ScrollArea } from "./components/ui/scroll-area"
import { Badge } from "./components/ui/badge"
import { Home, Wrench, Lightbulb, Zap, Send, User, Bot, Mic, MicOff } from "lucide-react"

const topicCategories = [
  {
    icon: Wrench,
    title: "Appliance Repair",
    description: "Fix common household appliances",
    examples: ["My dishwasher won't drain", "Refrigerator making noise", "Washing machine won't spin"],
  },
  {
    icon: Home,
    title: "Home Maintenance",
    description: "Keep your home in top condition",
    examples: ["How to caulk a bathtub", "Fixing a leaky faucet", "Painting interior walls"],
  },
  {
    icon: Lightbulb,
    title: "Life Hacks",
    description: "Smart tips for easier living",
    examples: ["Remove stubborn stains", "Organize small spaces", "Energy saving tips"],
  },
  {
    icon: Zap,
    title: "Quick Fixes",
    description: "Fast solutions for common problems",
    examples: ["Unclog a drain", "Fix a squeaky door", "Remove scratches from furniture"],
  },
]

// Replace with your actual Groq API key
const GROQ_API_KEY = "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"

const systemPrompt = `You are a knowledgeable and friendly home assistant AI specializing in household topics. Your expertise includes:

- Appliance repair and troubleshooting (refrigerators, washing machines, dishwashers, HVAC, etc.)
- Home maintenance and DIY projects
- Cleaning tips and techniques
- Organization and storage solutions
- Energy efficiency and cost-saving tips
- Safety guidelines for home repairs
- Seasonal home care (winterizing, spring cleaning, etc.)
- Kitchen tips and cooking hacks
- Gardening and lawn care basics
- Interior design and decorating advice

Always provide:
- Clear, step-by-step instructions when applicable
- Safety warnings when dealing with electrical, plumbing, or potentially dangerous tasks
- Cost-effective solutions when possible
- Alternative approaches for different skill levels
- Recommendations to call professionals when tasks are beyond DIY scope

Be conversational, helpful, and encouraging. If you're unsure about something, recommend consulting a professional rather than guessing.`

export default function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [isListening, setIsListening] = useState(false)
  const [recognition, setRecognition] = useState(null)

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognitionInstance = new SpeechRecognition()

      recognitionInstance.continuous = false
      recognitionInstance.interimResults = false
      recognitionInstance.lang = "en-US"

      recognitionInstance.onstart = () => {
        setIsListening(true)
      }

      recognitionInstance.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        setInput(transcript)
      }

      recognitionInstance.onend = () => {
        setIsListening(false)
      }

      recognitionInstance.onerror = (event) => {
        console.error("Speech recognition error:", event.error)
        setIsListening(false)
      }

      setRecognition(recognitionInstance)
    }
  }, [])

  const startListening = () => {
    if (recognition && !isListening) {
      recognition.start()
    }
  }

  const stopListening = () => {
    if (recognition && isListening) {
      recognition.stop()
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    // Check if API key is set
    if (GROQ_API_KEY === "gsk_YOUR_GROQ_API_KEY_HERE") {
      alert("Please set your Groq API key in the App.jsx file!")
      return
    }

    const userMessage = { id: Date.now(), role: "user", content: input }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      // Prepare messages for API
      const apiMessages = [
        { role: "system", content: systemPrompt },
        ...messages.map((msg) => ({ role: msg.role, content: msg.content })),
        { role: "user", content: userMessage.content },
      ]

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: apiMessages,
          stream: true,
        }),
      })

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      const assistantMessage = { id: Date.now() + 1, role: "assistant", content: "" }

      setMessages((prev) => [...prev, assistantMessage])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split("\n")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6)
            if (data === "[DONE]") continue

            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices?.[0]?.delta?.content

              if (content) {
                assistantMessage.content += content
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessage.id ? { ...msg, content: assistantMessage.content } : msg,
                  ),
                )
              }
            } catch (e) {
              // Ignore parsing errors for malformed chunks
            }
          }
        }
      }
    } catch (error) {
      console.error("Error:", error)
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: `Sorry, I encountered an error: ${error.message}. Please check your API key and try again.`,
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleExampleClick = (example) => {
    setInput(example)
  }

  const hasMessages = messages.length > 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-blue-600 rounded-full">
              <Home className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">Home Assistant AI</h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Your intelligent companion for home repairs, maintenance, and household tips. Get expert guidance powered by
            AI.
          </p>
        </div>

        {/* API Key Warning */}
        {GROQ_API_KEY === "gsk_YOUR_GROQ_API_KEY_HERE" && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-6">
            <strong>⚠️ Setup Required:</strong> Please replace "gsk_YOUR_GROQ_API_KEY_HERE" with your actual Groq API key
            in the App.jsx file.
          </div>
        )}

        {/* Topic Categories - Show only when no messages */}
        {!hasMessages && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {topicCategories.map((category, index) => {
              const IconComponent = category.icon
              return (
                <Card
                  key={index}
                  className="cursor-pointer transition-all hover:shadow-lg hover:scale-105"
                  onClick={() => setSelectedCategory(selectedCategory === category.title ? null : category.title)}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <IconComponent className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{category.title}</CardTitle>
                        <CardDescription>{category.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  {selectedCategory === category.title && (
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700 mb-3">Try asking:</p>
                        {category.examples.map((example, exampleIndex) => (
                          <Badge
                            key={exampleIndex}
                            variant="secondary"
                            className="cursor-pointer hover:bg-blue-100 mr-2 mb-2"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleExampleClick(example)
                            }}
                          >
                            {example}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </div>
        )}

        {/* Chat Interface */}
        <Card className="shadow-xl">
          <CardHeader className="bg-blue-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Chat with your Home Assistant
            </CardTitle>
            <CardDescription className="text-yellow-100">
              Ask me anything about home repairs, maintenance, or household tips!
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {/* Messages */}
            <ScrollArea className="h-96 p-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 mt-8">
                  <Bot className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium">Welcome to your Home Assistant!</p>
                  <p className="text-sm">Ask me about any household topic or select a category above to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`flex gap-3 max-w-[80%] ${
                          message.role === "user" ? "flex-row-reverse" : "flex-row"
                        }`}
                      >
                        <div
                          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                            message.role === "user" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {message.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                        </div>
                        <div
                          className={`rounded-lg px-4 py-2 ${
                            message.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
                          }`}
                        >
                          <div className="whitespace-pre-wrap">{message.content}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-3 justify-start">
                      <div className="flex gap-3 max-w-[80%]">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gray-200 text-gray-600">
                          <Bot className="h-4 w-4" />
                        </div>
                        <div className="rounded-lg px-4 py-2 bg-gray-100">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div
                              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                              style={{ animationDelay: "0.1s" }}
                            ></div>
                            <div
                              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                              style={{ animationDelay: "0.2s" }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Input Form */}
            <div className="border-t p-4">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
                      isListening
                        ? "Listening... speak now!"
                        : "Ask me about home repairs, maintenance, or any household topic..."
                    }
                    className={`pr-12 ${isListening ? "border-red-500 bg-red-50" : ""}`}
                    disabled={isLoading}
                  />
                  {recognition && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={`absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 ${
                        isListening ? "text-red-600 bg-red-100" : "text-gray-500 hover:text-blue-600"
                      }`}
                      onClick={isListening ? stopListening : startListening}
                      disabled={isLoading}
                    >
                      {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
                <Button type="submit" disabled={isLoading || !input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
              {!recognition && (
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Voice input not supported in this browser. Try Chrome, Edge, or Safari.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>💡 Tip: Always prioritize safety and consult professionals for complex electrical or plumbing work.</p>
        </div>
      </div>
    </div>
  )
}
