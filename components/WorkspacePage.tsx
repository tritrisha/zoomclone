"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Clock3, HelpCircle, Home, LogOut, Users, Video } from "lucide-react";
import { AuthUser } from "../lib/api";

export default function WorkspacePage({active,title,subtitle,children}:{active:"meetings"|"contacts"|"recordings";title:string;subtitle:string;children:(user:AuthUser)=>React.ReactNode}){
 const router=useRouter();const [user,setUser]=useState<AuthUser|null>(null);
 useEffect(()=>{const saved=localStorage.getItem("zooma_demo_user");if(!saved){router.replace("/auth");return}setUser(JSON.parse(saved))},[router]);
 function changeProfile(){localStorage.removeItem("zooma_demo_user");router.replace("/auth")}
 return <div className="app-shell"><aside className="sidebar"><div className="brand"><span className="brand-mark"><Video size={20}/></span><span>zooma</span></div><nav><button onClick={()=>router.push("/")}><Home/> Home</button><button className={active==="meetings"?"active":""} onClick={()=>router.push("/meetings")}><CalendarDays/> Meetings</button><button className={active==="contacts"?"active":""} onClick={()=>router.push("/contacts")}><Users/> Contacts</button><button className={active==="recordings"?"active":""} onClick={()=>router.push("/recordings")}><Clock3/> Recordings</button></nav><div className="sidebar-bottom"><button><HelpCircle/> Help & Support</button><button onClick={changeProfile}><LogOut/> Change profile</button></div></aside><main className="main"><header className="topbar"><div className="mobile-brand">zooma</div><div className="page-title-small">{title}</div><div className="top-actions"><div className="avatar">{(user?.name||"U").split(" ").map(x=>x[0]).join("").slice(0,2)}</div><div className="profile"><b>{user?.name||"Loading…"}</b><span>{user?.email}</span></div></div></header><section className="content subpage"><div className="subpage-heading"><div><h1>{title}</h1><p>{subtitle}</p></div></div>{user?children(user):<div className="loading">Loading…</div>}</section></main></div>
}
