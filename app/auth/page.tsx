"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Video } from "lucide-react";

export default function DemoSignup(){
 const router=useRouter();const [name,setName]=useState("user");const [email,setEmail]=useState("userdummy07@gmail.com");
 function submit(e:React.FormEvent){e.preventDefault();localStorage.setItem("zooma_demo_user",JSON.stringify({id:1,name:name.trim(),email:email.trim()}));router.replace("/")}
 return <main className="auth-page"><section className="auth-visual"><div className="auth-brand"><span><Video/></span> zooma</div><div><p>MEET WITHOUT LIMITS</p><h1>Connect, collaborate,<br/>and get more done.</h1><span>Secure, reliable video meetings for modern teams.</span></div><small>Demo workspace · No password required</small></section><section className="auth-side"><div className="auth-card"><div className="mobile-auth-brand"><Video/> zooma</div><h2>Set up your demo profile</h2><p>Enter the name other participants will see in meetings.</p><form onSubmit={submit}><label>Display name<input required minLength={2} value={name} onChange={e=>setName(e.target.value)} placeholder="Your name"/></label><label>Email address<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label><button className="auth-submit">Continue to Zooma</button></form><div className="demo-note">Demo mode — your details stay in this browser and no password is collected.</div></div></section></main>
}
