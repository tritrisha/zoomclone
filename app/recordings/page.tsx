"use client";
import { useEffect, useState } from "react";
import { CalendarDays, Download, Play, Search, Video } from "lucide-react";
import WorkspacePage from "../../components/WorkspacePage";
import { API_URL, api, RecordingItem } from "../../lib/api";

export default function RecordingsPage(){
 return <WorkspacePage active="recordings" title="Recordings" subtitle="Play and download recordings saved from your meetings.">{()=> <Content/>}</WorkspacePage>
}
function Content(){
 const [items,setItems]=useState<RecordingItem[]>([]);const [query,setQuery]=useState("");const [playing,setPlaying]=useState<RecordingItem|null>(null);const [error,setError]=useState("");
 useEffect(()=>{api.recordings().then(setItems).catch(e=>setError(e.message))},[]);
 const filtered=items.filter(x=>x.title.toLowerCase().includes(query.toLowerCase()));
 const url=(item:RecordingItem)=>`${API_URL}/api/recordings/${item.id}/download`;
 return <><div className="page-toolbar"><div className="inner-search"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search recordings"/></div></div>{error&&<div className="error">{error}</div>}{playing&&<div className="playback"><div><h3>{playing.title}</h3><button onClick={()=>setPlaying(null)}>Close</button></div><video src={url(playing)} controls autoPlay/></div>}{filtered.length?<div className="recording-list">{filtered.map(item=><article className="recording-card" key={item.id}><div className="recording-thumb"><Video/><button onClick={()=>setPlaying(item)}><Play/></button></div><div className="recording-info"><h3>{item.title}</h3><p><CalendarDays/> {new Date(item.created_at).toLocaleString()} <span>·</span> {Math.max(1,Math.round(item.duration_seconds/60))} min</p><span>{(item.size_bytes/1024/1024).toFixed(1)} MB · {item.meeting_id}</span></div><a className="download-btn" href={url(item)}><Download/> Download</a></article>)}</div>:<div className="empty"><Video/><h3>No recordings yet</h3><p>Open a meeting, select Record, then stop recording to save it here.</p></div>}</>
}
