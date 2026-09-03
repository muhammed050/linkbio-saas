'use client'
import { useEffect } from 'react'

export default function EditorPolish(){
  useEffect(()=>{
    document.body.dataset.lkEditor='true'
    const root=document.documentElement
    const style=document.createElement('style')
    style.dataset.lkEditorStyle='true'
    style.textContent=`
      body[data-lk-editor] button,body[data-lk-editor] a,body[data-lk-editor] input,body[data-lk-editor] select,body[data-lk-editor] textarea{transition:transform .16s ease,box-shadow .16s ease,opacity .16s ease,border-color .16s ease,background-color .16s ease}
      body[data-lk-editor] button:not(:disabled):active{transform:translateY(1px) scale(.985)}
      body[data-lk-editor] button:focus-visible,body[data-lk-editor] a:focus-visible{outline:3px solid color-mix(in srgb,currentColor 22%,transparent);outline-offset:3px}
      body[data-lk-editor] input:focus,body[data-lk-editor] select:focus,body[data-lk-editor] textarea:focus{transform:translateY(-1px);box-shadow:0 0 0 4px color-mix(in srgb,#111 9%,transparent)}
      body[data-lk-editor] .contentCard,body[data-lk-editor] .itemEditor,body[data-lk-editor] .controlCard,body[data-lk-editor] .addBlock{transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}
      body[data-lk-editor] .contentCard:hover,body[data-lk-editor] .itemEditor:hover,body[data-lk-editor] .controlCard:hover,body[data-lk-editor] .addBlock:hover{transform:translateY(-2px);box-shadow:0 14px 35px rgba(20,20,20,.07)}
      body[data-lk-editor] .sidebar nav button{position:relative;overflow:hidden}
      body[data-lk-editor] .sidebar nav button::after{content:'';position:absolute;inset:auto 12px 4px;height:2px;border-radius:99px;background:currentColor;transform:scaleX(0);transform-origin:center;transition:transform .18s ease}
      body[data-lk-editor] .sidebar nav button:hover::after,body[data-lk-editor] .sidebar nav button.active::after{transform:scaleX(1)}
      body[data-lk-editor] .is-submitting{opacity:.68!important;cursor:wait!important;pointer-events:none!important}
      body[data-lk-editor] .editor-polish-spinner{display:inline-block;width:14px;height:14px;border:2px solid currentColor;border-left-color:transparent;border-radius:50%;animation:lk-spin .65s linear infinite;vertical-align:-2px;margin-inline-end:7px}
      @keyframes lk-spin{to{transform:rotate(360deg)}}
      @media (prefers-reduced-motion:reduce){body[data-lk-editor] *,body[data-lk-editor] *::before,body[data-lk-editor] *::after{transition:none!important;animation:none!important}}
    `
    document.head.appendChild(style)
    const onSubmit=(event:Event)=>{
      const form=event.target as HTMLFormElement
      const submitters=form.querySelectorAll<HTMLButtonElement>('button[type="submit"]')
      submitters.forEach(button=>{button.classList.add('is-submitting');button.setAttribute('aria-busy','true');button.dataset.originalHtml=button.innerHTML;button.innerHTML='<span class="editor-polish-spinner" aria-hidden="true"></span>جارٍ التنفيذ…'})
    }
    document.addEventListener('submit',onSubmit,true)
    return()=>{document.removeEventListener('submit',onSubmit,true);delete document.body.dataset.lkEditor;style.remove();root.removeAttribute('data-lk-editor')}
  },[])
  return null
}
