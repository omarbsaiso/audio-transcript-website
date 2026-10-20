import { useState, useRef } from 'react'
import './App.css'

function App() {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [statusText, setStatusText] = useState('اضغط للبدء')

  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])

  // مفتاح الـ API من ملف البيئة
  const apiKey = import.meta.env.VITE_GROQ_API_KEY

  // بدء التسجيل
  const startRecording = async () => {
    try {
      audioChunksRef.current = []
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorderRef.current.onstop = async () => {
        setStatusText('جاري معالجة الصوت وتحويله...')
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await sendAudioToGroq(audioBlob)
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
      setStatusText('جاري التسجيل... اضغط مرة أخرى للإيقاف')
    } catch (err) {
      console.error("خطأ في الوصول إلى الميكروفون:", err)
      setStatusText('تعذر الوصول إلى الميكروفون')
    }
  }

  // إيقاف التسجيل
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      // إيقاف جميع مسارات الصوت من المتصفح
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      setIsRecording(false)
    }
  }

  // التحكم بالزر (بدء أو إيقاف)
  const handleRecordClick = () => {
    if (!isRecording) {
      startRecording()
    } else {
      stopRecording()
    }
  }

  // إرسال الصوت إلى Groq Whisper API
  const sendAudioToGroq = async (audioBlob) => {
    const formData = new FormData()
    formData.append('file', audioBlob, 'audio.webm')
    formData.append('model', 'whisper-large-v3')
    formData.append('language', 'ar') // تحديد اللغة العربية لتحسين الدقة
    formData.append('response_format', 'json')

    try {
      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        },
        body: formData
      })

      const data = await response.json()

      if (response.ok) {
        setTranscript(data.text || '')
        setStatusText('اضغط للبدء')
      } else {
        console.error("خطأ من السيرفر:", data)
        setStatusText('حدث خطأ أثناء تحويل الصوت')
      }
    } catch (error) {
      console.error("خطأ في الاتصال:", error)
      setStatusText('فشل الاتصال بالخادم')
    }
  }

  // زر نسخ النص
  const copyToClipboard = () => {
    navigator.clipboard.writeText(transcript)
    alert('تم نسخ النص بنجاح!')
  }

  return (
    <div style={{
      maxWidth: '560px',
      margin: '0 auto',
      padding: '40px 20px',
      textAlign: 'center',
      direction: 'rtl',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* العنوان */}
      <header style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 'bold', color: '#14274e', margin: '0 0 10px 0' }}>صوت</h1>
        <p style={{ fontSize: '1.2rem', color: '#6c757d', margin: 0 }}>اضغط، احكي، وخلّي الكلام يتحوّل لنص</p>
      </header>

      <main>
        {/* زر التسجيل */}
        <button
          type="button"
          onClick={handleRecordClick}
          style={{
            width: '140px',
            height: '140px',
            borderRadius: '50%',
            fontSize: '3rem',
            backgroundColor: isRecording ? '#dc3545' : '#14274e', // يتحول للأحمر أثناء التسجيل
            color: 'white',
            border: 'none',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            cursor: 'pointer',
            transition: 'background-color 0.2s ease, transform 0.1s ease',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          {isRecording ? '⏹️' : '🎙️'}
        </button>

        {/* الحالة */}
        <p style={{ fontWeight: 'bold', color: isRecording ? '#dc3545' : '#6c757d', margin: '20px 0 30px 0' }}>
          {statusText}
        </p>

        {/* النص */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '16px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          padding: '20px',
          border: '1px solid #eaeaea'
        }}>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            style={{
              width: '100%',
              border: 'none',
              resize: 'none',
              outline: 'none',
              fontSize: '1rem',
              direction: 'rtl',
              background: 'transparent',
              padding: '10px'
            }}
            rows={7}
            placeholder="رح يظهر النص هون…"
          ></textarea>
          <button
            type="button"
            onClick={copyToClipboard}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '1.1rem',
              backgroundColor: '#14274e',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              marginTop: '15px',
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d3557'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#14274e'}
          >
            نسخ النص
          </button>
        </div>
      </main>

      {/* الفوتر */}
      <footer style={{ marginTop: '40px', color: '#6c757d' }}>
        made By <b style={{ color: '#14274e' }}>Omar</b>
      </footer>
    </div>
  )
}

export default App