"use client"

import { client } from '@/lib/client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { useRef, useState, useEffect } from 'react'
import { format } from 'date-fns'
import { useRealtime } from '@/lib/realtime-client'

function formatTimeRemaining(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

const STORAGE_KEY = 'chat_username'

function Room() {
  const params = useParams()
  const roomId = params.roomId as string
  const [username, setUsername] = useState<string | null>(null)
  const router = useRouter()
  const [input, setInput] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const [copyState, setCopyState] = useState('COPY_ID')
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)

  const { data: ttlData } = useQuery({
    queryKey: ['ttl', roomId],
    queryFn: async () => {
      const res = await client.room.ttl.get({ query: { roomId } })
      return res.data
    }
  })

  useEffect(() => {
    if (ttlData?.ttl !== undefined) setTimeRemaining(ttlData.ttl)
  }, [ttlData])

  useEffect(() => {
    if (timeRemaining === null) return
    if (timeRemaining <= 0) {
      router.push("/?destroyed=true")
      return
    }
    const interval = setInterval(() => {
      setTimeRemaining((prev) => (prev === null || prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [timeRemaining, router])

  const { data: messages, refetch } = useQuery({
    queryKey: ['messages', roomId],
    queryFn: async () => {
      const res = await client.messages.get({ query: { roomId } })
      return res.data?.messages || []
    }
  })

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) setUsername(stored)
  }, [])

  const { mutate: sendMessage, isPending } = useMutation({
    mutationFn: async ({ text }: { text: string }) => {
      if (!username) return
      await client.messages.post({ sender: username, text }, { query: { roomId } })
    }
  })

  useRealtime({
    channels: [roomId],
    events: ["chat.message", "chat.destroy"],
    onData: ({ event }) => {
      if (event === "chat.message") refetch()
      if (event === "chat.destroy") router.push("/?destroyed=true")
    },
  })

  const { mutate: destroyRoom } = useMutation({
    mutationFn: async () => {
      await client.room.delete(null, { query: { roomId } })
    },
  })

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopyState('DONE')
    setTimeout(() => setCopyState('COPY_ID'), 2000)
  }

  return (
    <main className='flex flex-col h-screen max-h-screen bg-black font-mono text-green-500 selection:bg-green-500 selection:text-black overflow-hidden'>
      {/* SCANLINE OVERLAY - Pointer events none is crucial */}
      <div className="pointer-events-none fixed inset-0 z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] opacity-40 md:opacity-100" />

      {/* HEADER - Responsive Flex */}
      <header className='border-b border-green-900/50 p-3 md:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between bg-black gap-4'>
        <div className="flex items-center gap-4 md:gap-6 w-full sm:w-auto">
          <div className="flex flex-col">
            <span className='text-[9px] md:text-[10px] text-green-800 font-bold'>// SESSION_ID</span>
            <div className="flex items-center gap-2">
              <span className='text-xs md:text-sm tracking-tighter'>0x{roomId.slice(0, 6)}...</span>
              <button 
                onClick={handleCopy} 
                className="text-[8px] md:text-[9px] border border-green-900 px-1 hover:bg-green-500 hover:text-black transition-all"
              >
                [{copyState}]
              </button>
            </div>
          </div>

          <div className="flex flex-col border-l border-green-900/50 pl-4 md:pl-6">
            <span className='text-[9px] md:text-[10px] text-green-800 font-bold'>// AUTO_PURGE</span>
            <span className={`text-xs md:text-sm font-black ${timeRemaining !== null && timeRemaining < 60 ? "animate-pulse text-red-600" : "text-green-500"}`}>
              {timeRemaining !== null ? formatTimeRemaining(timeRemaining) : "CALCULATING..."}
            </span>
          </div>
        </div>

        <button 
          onClick={() => destroyRoom()} 
          className="w-full sm:w-auto text-[9px] md:text-[10px] border border-red-900 text-red-900 hover:bg-red-600 hover:text-white px-3 py-1.5 transition-all font-bold"
        >
          [ EXECUTE_PURGE ]
        </button>
      </header>

      {/* MESSAGES - Improved scrolling and word breaking */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 scrollbar-hide bg-[radial-gradient(circle_at_center,_#041204_0%,_#000000_100%)]">
        {messages?.length === 0 && (
          <div className="flex items-center justify-center h-full opacity-20">
            <p className="text-[10px] md:text-sm animate-pulse text-center">LISTENING FOR INCOMING DATA...</p>
          </div>
        )}

        {messages?.map((msg: any) => (
          <div key={msg.id} className="flex flex-col group border-l border-transparent hover:border-green-900 pl-2 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-green-900">[{format(msg.timestamp, "HH:mm:ss")}]</span>
                <span className={`text-xs font-bold uppercase ${msg.sender === username ? "text-white" : "text-green-400"}`}>
                  {msg.sender === username ? "LOCAL_USER" : msg.sender}:
                </span>
              </div>
              <p className="text-sm text-green-200/90 break-words whitespace-pre-wrap leading-relaxed">{msg.text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* INPUT - Sticky at bottom */}
      <div className="p-3 md:p-4 border-t border-green-900/50 bg-black">
        <div className='flex items-center gap-2 md:gap-3 max-w-full'>
          <span className='text-green-500 font-bold animate-pulse'>$</span>
          <input
            ref={inputRef}
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && input.trim() && username) {
                sendMessage({ text: input.trim() })
                setInput('')
              }
            }}
            placeholder='await input_stream...'
            className='flex-1 bg-transparent border-none focus:ring-0 outline-none text-green-400 placeholder:text-green-900 text-sm md:text-base w-full min-w-0'
          />
          {isPending && <span className="text-[10px] animate-spin">/</span>}
        </div>
      </div>
    </main>
  )
}

export default Room
