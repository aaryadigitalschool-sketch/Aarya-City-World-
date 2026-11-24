import React, { useEffect, useState } from 'react';
import { Flag, Send, Users, Wifi, WifiOff, X } from 'lucide-react';
import type { RemotePlayerData } from '../game/types';

export interface ChatMsg {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  moderated?: boolean;
}

export interface ActiveRoomInfo {
  code: string;
  name: string;
  hostId: string;
  maxPlayers: number;
  players: RemotePlayerData[];
}

interface PublicRoomSummary {
  code: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
}

interface MultiplayerModalProps {
  connected: boolean;
  selfPlayerId: string | null;
  room: ActiveRoomInfo | null;
  errorText: string | null;
  chatLog: ChatMsg[];
  onCreateRoom: (roomName: string, maxPlayers: number, isPublic: boolean) => void;
  onJoinCode: (code: string) => void;
  onQuickJoin: () => void;
  onLeaveRoom: () => void;
  onSendChat: (text: string) => void;
  onReportPlayer: (targetId: string) => void;
  onStartCoOpPlay: () => void;
  onClose: () => void;
}

export const MultiplayerModal: React.FC<MultiplayerModalProps> = ({
  connected,
  selfPlayerId,
  room,
  errorText,
  chatLog,
  onCreateRoom,
  onJoinCode,
  onQuickJoin,
  onLeaveRoom,
  onSendChat,
  onReportPlayer,
  onStartCoOpPlay,
  onClose,
}) => {
  const [roomName, setRoomName] = useState('Kathmandu Co-op Run');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [joinCode, setJoinCode] = useState('');
  const [chatText, setChatText] = useState('');
  const [publicRooms, setPublicRooms] = useState<PublicRoomSummary[]>([]);

  useEffect(() => {
    fetch('/api/rooms')
      .then((r) => r.json())
      .then((d: { rooms?: PublicRoomSummary[] }) => setPublicRooms(d.rooms || []))
      .catch(() => setPublicRooms([]));
  }, [room]);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/75">
      <div className="w-full max-w-3xl max-h-[88vh] bg-[#0e1420] border border-white/15 rounded-lg flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            {connected ? (
              <Wifi className="w-4 h-4 text-emerald-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-slate-400" />
            )}
            <div>
              <h2 className="font-display font-bold text-lg text-slate-100">
                Online Co-op Multiplayer
              </h2>
              <p className="text-xs text-slate-400">
                Server-validated co-op sessions · Separate from Offline Story progression
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex flex-col gap-4">
          {errorText ? (
            <div className="p-3 rounded bg-red-950/70 border border-red-500/40 text-xs text-red-200">
              {errorText}
            </div>
          ) : null}

          {!room ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Create Room */}
              <div className="p-4 rounded bg-[#141c2c] border border-white/10 flex flex-col gap-3">
                <h3 className="font-display font-semibold text-sm text-amber-400">
                  Create Co-op Room
                </h3>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  maxLength={32}
                  placeholder="Room name"
                  className="px-3 py-2 rounded bg-[#090d16] border border-white/15 text-xs text-slate-100"
                />
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Max Players</span>
                  <select
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(Number(e.target.value))}
                    className="px-2 py-1 rounded bg-[#090d16] border border-white/15 text-xs"
                  >
                    {[2, 4, 6, 8].map((n) => (
                      <option key={n} value={n}>
                        {n} Players
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => onCreateRoom(roomName, maxPlayers, true)}
                  className="py-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs"
                >
                  Create & Host Room
                </button>
              </div>

              {/* Join Room */}
              <div className="p-4 rounded bg-[#141c2c] border border-white/10 flex flex-col gap-3">
                <h3 className="font-display font-semibold text-sm text-cyan-300">
                  Join Co-op Session
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    placeholder="Enter 6-char code"
                    className="flex-1 px-3 py-2 rounded bg-[#090d16] border border-white/15 text-xs text-slate-100 font-mono-tabular uppercase"
                  />
                  <button
                    onClick={() => onJoinCode(joinCode)}
                    className="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs"
                  >
                    Join
                  </button>
                </div>
                <button
                  onClick={onQuickJoin}
                  className="py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-medium border border-white/10"
                >
                  Quick Join Public Session
                </button>

                {publicRooms.length > 0 ? (
                  <div className="pt-1 flex flex-col gap-1.5">
                    <div className="text-[11px] text-slate-400">Active Public Rooms</div>
                    {publicRooms.map((r) => (
                      <button
                        key={r.code}
                        onClick={() => onJoinCode(r.code)}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded bg-[#090d16] hover:bg-slate-800 border border-white/10 text-xs"
                      >
                        <span className="text-slate-200 truncate">{r.name}</span>
                        <span className="font-mono-tabular text-cyan-300">
                          {r.code} · {r.playerCount}/{r.maxPlayers}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Active Room Roster */}
              <div className="p-4 rounded bg-[#141c2c] border border-white/10 flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-display font-bold text-sm text-slate-100">{room.name}</h3>
                    <span className="font-mono-tabular text-xs text-amber-400 font-bold">
                      CODE: {room.code}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5 mt-2">
                    {room.players.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded bg-[#090d16] border border-white/10 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="text-slate-100 font-medium">
                            {p.name}
                            {p.id === selfPlayerId ? ' (You)' : ''}
                            {p.id === room.hostId ? ' · Host' : ''}
                          </span>
                        </div>
                        {p.id !== selfPlayerId ? (
                          <button
                            onClick={() => onReportPlayer(p.id)}
                            title="Report player"
                            className="text-slate-400 hover:text-red-400 p-1"
                          >
                            <Flag className="w-3 h-3" />
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      onStartCoOpPlay();
                      onClose();
                    }}
                    className="flex-1 py-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs"
                  >
                    Enter Co-op World
                  </button>
                  <button
                    onClick={onLeaveRoom}
                    className="px-3 py-2 rounded bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/40 text-xs"
                  >
                    Leave
                  </button>
                </div>
              </div>

              {/* Moderated Room Chat */}
              <div className="p-4 rounded bg-[#141c2c] border border-white/10 flex flex-col justify-between h-64">
                <div className="text-xs font-semibold text-slate-400 mb-2">
                  Room Chat (Auto-Moderated)
                </div>
                <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-1 text-xs">
                  {chatLog.length === 0 ? (
                    <div className="text-slate-500">No messages yet. Say namaste to your squad.</div>
                  ) : (
                    chatLog.map((m) => (
                      <div key={m.id} className="text-slate-200">
                        <span className="font-semibold text-cyan-300">{m.playerName}: </span>
                        <span>{m.text}</span>
                      </div>
                    ))
                  )}
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!chatText.trim()) return;
                    onSendChat(chatText);
                    setChatText('');
                  }}
                  className="flex gap-2 mt-2"
                >
                  <input
                    type="text"
                    value={chatText}
                    onChange={(e) => setChatText(e.target.value)}
                    placeholder="Type message..."
                    className="flex-1 px-2.5 py-1.5 rounded bg-[#090d16] border border-white/15 text-xs text-slate-100"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
