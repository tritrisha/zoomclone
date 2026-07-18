export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type Meeting = {
  id: number; meeting_id: string; title: string; description: string;
  host_name: string; scheduled_at: string; duration_minutes: number;
  status: "scheduled" | "active" | "ended"; invite_link: string;
  participant_count: number;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers }
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail || "Something went wrong");
  }
  return response.json();
}

export const api = {
  me: () => request<AuthUser>("/api/auth/me"),
  meetings: () => request<{ upcoming: Meeting[]; recent: Meeting[] }>("/api/meetings"),
  meeting: (id: string) => request<Meeting>(`/api/meetings/${id}`),
  instant: () => request<Meeting>("/api/meetings/instant", { method: "POST" }),
  schedule: (body: object) => request<Meeting>("/api/meetings", { method: "POST", body: JSON.stringify(body) }),
  join: (id: string, display_name: string) => request<{ meeting: Meeting; participant_id: number }>(`/api/meetings/${id}/join`, { method: "POST", body: JSON.stringify({ display_name }) }),
  participants: (id: string) => request<Array<{ id: number; display_name: string; is_host: boolean; is_muted: boolean }>>(`/api/meetings/${id}/participants`),
  muteAll: (id: string) => request(`/api/meetings/${id}/mute-all`, { method: "POST" }),
  removeParticipant: (id: string, participantId: number) => request(`/api/meetings/${id}/participants/${participantId}`, { method: "DELETE" })
  ,endMeeting: (id:string) => request(`/api/meetings/${id}/end`,{method:"POST"})
  ,leaveMeeting: (id:string,participantId:number) => request(`/api/meetings/${id}/leave?participant_id=${participantId}`,{method:"POST"})
  ,recordings: () => request<RecordingItem[]>("/api/recordings")
};

export type AuthUser = { id:number; name:string; email:string };
export type RecordingItem = {id:number;meeting_id:string;title:string;filename:string;size_bytes:number;duration_seconds:number;created_at:string};
