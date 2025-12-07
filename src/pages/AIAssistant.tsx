// src/pages/AIAssistant.tsx
import React, { useState, useRef, useEffect } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import Typography from '@mui/material/Typography'

interface Message {
  text: string
  sender: 'user' | 'ai'
}

const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const listRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages, isLoading])

  const handleSend = async () => {
    if (input.trim() === '' || isLoading) return

    const userMessage: Message = { text: input, sender: 'user' }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      })

      if (!response.ok) throw new Error('Network response was not ok')

      const data = await response.json()
      const aiMessage: Message = { text: data.reply, sender: 'ai' }
      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      console.error('Failed to get AI response:', error)
      const errorMessage: Message = { text: 'No se pudo conectar con el Asistente de IA.', sender: 'ai' }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 2 }}>Asistente de IA</Typography>
      <Paper sx={{ p: 2, borderRadius: 2, height: 600, display: 'flex', flexDirection: 'column' }}>
        <Box ref={listRef} sx={{ flex: 1, mb: 2, overflowY: 'auto' }}>
          <List>
            {messages.map((msg, index) => (
              <ListItem key={index} sx={{ justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                <Paper sx={{ p: 1.5, maxWidth: '80%', bgcolor: msg.sender === 'user' ? 'success.main' : 'grey.700', color: msg.sender === 'user' ? 'common.white' : 'common.white' }}>
                  <Typography variant="body2">{msg.text}</Typography>
                </Paper>
              </ListItem>
            ))}
            {isLoading && (
              <ListItem sx={{ justifyContent: 'flex-start' }}>
                <Paper sx={{ p: 1.5, bgcolor: 'grey.700', color: 'grey.200' }}>
                  <Typography variant="body2">Escribiendo...</Typography>
                </Paper>
              </ListItem>
            )}
          </List>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField fullWidth value={input} onChange={(e) => setInput(e.target.value)} placeholder="Escribe tu consulta..." disabled={isLoading} onKeyPress={(e) => e.key === 'Enter' && handleSend()} />
          <Button variant="contained" color="success" onClick={handleSend} disabled={isLoading}>
            {isLoading ? '...' : 'Enviar'}
          </Button>
        </Box>
      </Paper>
    </Box>
  )
}

export default AIAssistant