import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAppStore = create(
  persist(
    (set, get) => ({
      // ── Theme ─────────────────────────────────────────────────────
      theme: 'dark',
      toggleTheme: () => set((s) => {
        const next = s.theme === 'dark' ? 'light' : 'dark'
        if (next === 'dark') {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
        return { theme: next }
      }),

      // ── Session ──────────────────────────────────────────────────
      sessionId: null,
      setSessionId: (id) => set({ sessionId: id }),

      // ── Current paper ────────────────────────────────────────────
      paperId: null,
      paperTitle: null,
      setPaper: (id, title) => set({ paperId: id, paperTitle: title }),
      clearPaper: () => set({ paperId: null, paperTitle: null }),

      // ── Paper images (kept for future use) ───────────────────────
      paperImages: [],
      setPaperImages: (imgs) => set({ paperImages: imgs }),

      // ── Chat messages ────────────────────────────────────────────
      chatMessages: [],
      addChatMessage: (msg) => set((s) => ({ chatMessages: [...s.chatMessages, msg] })),
      updateLastMessage: (content) =>
        set((s) => {
          const msgs = [...s.chatMessages]
          if (msgs.length > 0) msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content }
          return { chatMessages: msgs }
        }),
      clearChat: () => set({ chatMessages: [] }),

      // ── Chat chunks (for PDF highlighting) ───────────────────────
      chatChunks: [],
      setChatChunks: (chunks) => set({ chatChunks: chunks }),
      clearChatChunks: () => set({ chatChunks: [] }),

      // ── Search state ─────────────────────────────────────────────
      searchQuery: '',
      setSearchQuery: (q) => set({ searchQuery: q }),
      agentLogs: [],
      addAgentLog: (log) => set((s) => ({ agentLogs: [...s.agentLogs, log] })),
      clearAgentLogs: () => set({ agentLogs: [] }),
      searchResults: null,
      setSearchResults: (r) => set({ searchResults: r }),
      isSearching: false,
      setIsSearching: (v) => set({ isSearching: v }),

      // ── Arena papers ─────────────────────────────────────────────
      arenaPaperA: null,
      arenaPaperB: null,
      arenaProcessedA: null,
      arenaProcessedB: null,
      arenaTriggerProcess: false,
      setArenaPaper: (slot, paper) => set((state) => ({
        ...state,
        [slot === 'A' ? 'arenaPaperA' : 'arenaPaperB']: paper
      })),
      setArenaProcessed: (slot, paper) => set((state) => ({
        ...state,
        [slot === 'A' ? 'arenaProcessedA' : 'arenaProcessedB']: paper
      })),
      setArenaTriggerProcess: (v) => set({ arenaTriggerProcess: v }),
      clearArenaPapers: () => set({
        arenaPaperA: null, arenaPaperB: null,
        arenaProcessedA: null, arenaProcessedB: null,
        arenaTriggerProcess: false,
      }),
    }),
    {
      name: 'research-io-store',
      partialize: (s) => ({
        theme: s.theme,
        paperId: s.paperId,
        paperTitle: s.paperTitle,
        arenaPaperA: s.arenaPaperA,
        arenaPaperB: s.arenaPaperB,
        arenaProcessedA: s.arenaProcessedA,
        arenaProcessedB: s.arenaProcessedB,
      }),
    }
  )
)
