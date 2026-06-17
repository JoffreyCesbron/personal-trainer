import { useState } from "react";
import { reportSoreness } from "../api/client";
import type { EventResponse } from "../api/types";

const ZONES = ["lower back", "left knee", "right knee", "shoulders", "quads", "hamstrings", "glutes"];

interface Props {
  clientId: string;
  onUpdate: (resp: EventResponse) => void;
}

export function SorenessButton({ clientId, onUpdate }: Props) {
  const [open, setOpen] = useState(false);
  const [zone, setZone] = useState(ZONES[0]);
  const [intensity, setIntensity] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const resp = await reportSoreness(clientId, zone, intensity);
      onUpdate(resp);
      setOpen(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        Report Soreness
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-80 shadow-xl">
            <h3 className="font-semibold text-gray-900 mb-4">Report Soreness</h3>

            <label className="block text-sm text-gray-600 mb-1">Zone</label>
            <select
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              {ZONES.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>

            <label className="block text-sm text-gray-600 mb-1">
              Intensity: <span className="font-bold text-gray-900">{intensity}/10</span>
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
              className="w-full mb-4 accent-orange-500"
            />

            {error && <p className="text-red-500 text-xs mb-3">{error}</p>}

            <div className="flex gap-2">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 border border-gray-200 text-gray-700 text-sm py-2 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={loading}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm py-2 rounded-lg transition-colors"
              >
                {loading ? "Sending…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
