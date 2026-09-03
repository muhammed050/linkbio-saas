'use client'
import { useEffect } from 'react'

export default function Error({error,retry}:{error:Error&{digest?:string};retry:()=>void}){
  useEffect(()=>{console.error(error)},[error])
  return <main className="editor-error" dir="rtl"><section className="editor-error-card"><div className="editor-error-icon">!</div><h1>حدث خطأ مؤقت</h1><p>لم نتمكن من إتمام العملية. لم نفقد بياناتك المحفوظة.</p><div className="editor-error-actions"><button type="button" onClick={retry}>المحاولة مرة أخرى</button><a href="/dashboard">العودة للوحة التحكم</a></div></section></main>
}
