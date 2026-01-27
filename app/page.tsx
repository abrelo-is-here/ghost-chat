"use client";

import { useState, useEffect } from "react";
import { nanoid } from "nanoid";
import { useMutation } from "@tanstack/react-query";
import { client } from "@/lib/client";
import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense } from "react";

const ANIMALS = ["wolf", "hawk", "bear", "shark", "vulture", "cobra"];
const STORAGE_KEY = "chat_username";

const generateUsername = () => {
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `anon_${animal}_${nanoid(4)}`.toLowerCase();
};

export default function Home() {
  const [username, setUsername] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const wasDestroyed = searchParams.get("destroyed") === "true";
  const error = searchParams.get("error");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setUsername(stored);
      return;
    }
    const generated = generateUsername();
    localStorage.setItem(STORAGE_KEY, generated);
    setUsername(generated);
  }, []);

  const { mutate: createRoom, isPending } = useMutation({
    mutationFn: async () => {
      const res = await client.room.create.post();
      if (res.status === 200 && res.data?.roomId) {
        router.push(`/room/${res.data.roomId}`);
      }
    },
  });

  // BIOS / Boot sequence loader
  if (!username) {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center font-mono text-green-800 text-xs tracking-widest uppercase">
        <div className="space-y-1 animate-pulse">
          <p>{">"} INITIALIZING SECURE_PROTOCOLS...</p>
          <p>{">"} ALLOCATING MEMORY...</p>
          <p>{">"} ESTABLISHING ENCRYPTED_IDENTITY...</p>
        </div>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black font-mono text-green-500 p-4 relative overflow-hidden">
      {/* SCANLINE EFFECT */}
      <div className="pointer-events-none fixed inset-0 z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_3px,3px_100%]" />

      <div className="w-full max-w-md space-y-6 z-10">
        {/* STATUS NOTIFICATIONS */}
        {(wasDestroyed || error) && (
          <div className="border border-red-900 bg-red-950/20 p-4 animate-pulse">
            <p className="text-red-500 text-xs font-bold uppercase tracking-tighter">
              [!] {error === "room-not-found" ? "404: OBJECT NOT FOUND" : 
                    error === "room-full" ? "ERROR: CAPACITY REACHED" : 
                    "SUCCESS: ROOM PURGED"}
            </p>
            <p className="text-red-900 text-[10px] mt-1 italic">
              {wasDestroyed ? "All session data has been zeroed out." : "Action cannot be completed."}
            </p>
          </div>
        )}

        <div className="text-center space-y-2 mb-8">
          <h1 className="text-3xl font-black tracking-tighter text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]">
            VOID_CHAT v1.0
          </h1>
          <p className="text-green-900 text-[10px] uppercase tracking-[0.2em]">
            Ephemeral . Encrypted . Trace-less
          </p>
        </div>

        <div className="border border-green-900/50 bg-black/80 p-1 shadow-[0_0_20px_rgba(0,20,0,1)]">
          <div className="border border-green-900/30 p-6 space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] text-green-800 font-bold uppercase tracking-widest">
                // ACTIVE_IDENTITY
              </label>

              <div className="relative group">
                <div className="bg-green-950/10 border border-green-900 px-4 py-3 text-sm text-green-400">
                  <span className="opacity-50 mr-2">$</span>
                  {username}
                </div>
                <div className="absolute top-0 left-0 w-full h-full bg-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </div>
            </div>

            <button
              onClick={() => createRoom()}
              disabled={isPending}
              className="w-full group relative overflow-hidden border border-green-500 bg-transparent p-3 text-xs font-bold text-green-500 transition-all hover:bg-green-500 hover:text-black cursor-pointer disabled:opacity-30"
            >
              <span className="relative z-10">
                {isPending ? "[ INITIALIZING... ]" : "[ INITIALIZE_NEW_SESSION ]"}
              </span>
              {/* Button Glitch Hover Effect */}
              <div className="absolute inset-0 bg-green-400 translate-y-full group-hover:translate-y-0 transition-transform duration-100 ease-out" />
            </button>
          </div>
        </div>

        <div className="text-center">
            <p className="text-green-950 text-[9px] uppercase tracking-widest">
                Connection: Secure / Protocol: Stealth
            </p>
        </div>
      </div>
    </div>
  );
}