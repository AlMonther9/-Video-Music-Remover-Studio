# 🎙️ Video Music Remover Studio | أداة إزالة الموسيقى وتصفية الصوت

<p align="center">
  <b><a href="#-english-version">English Version</a></b> • <b><a href="#-النسخة-العربية">النسخة العربية</a></b>
</p>

---

## 🇬🇧 English Version

> **Keep it halal bro 🌿**  
> A privacy-first, locally-powered web studio with a warm Arabic cozy aesthetic designed to isolate human speech and remove background music/melodies from video files 100% locally on your machine without relying on external cloud servers.

---

### ✨ Key Features

- 🔒 **100% Local Privacy**: All video processing and audio separation happen locally on your computer. No video clips or data are ever uploaded to external servers.
- 🤖 **Meta Demucs AI Engine**: Powered by state-of-the-art deep learning neural models (`HTDemucs` & `HTDemucs FT`) developed by Meta for high-fidelity stem separation.
- ⚡ **Fast FFmpeg Integration**: Extracts and remuxes clean audio back into the original video stream without lossy video re-encoding, preserving original video quality and ensuring ultra-fast processing.
- 🎨 **Warm "Arabic Cozy" Aesthetic**: Premium custom visual experience built around natural color tones (Alabaster Cream, Muted Sage, Earthy Clay, Deep Espresso) featuring oriental botanical line art and minimalist one-line motifs.
- 🎛️ **Model Precision Controls**: Switch between high-speed model processing for daily clips and fine-tuned model precision for maximum clarity.
- 📱 **Headerless Single-Page Studio UI**: Distraction-free single-screen workflow with real-time job progress tracking and side-by-side video result previews.

---

### 🛠️ Tech Stack

- **Frontend**: [Next.js 16 (App Router)](https://nextjs.org/) + [React 19](https://react.dev/) + [TailwindCSS](https://tailwindcss.com/)
- **Icons & Art**: Lucide Icons + Custom SVG Botanical Line Art & Arabesque Patterns
- **Audio AI Engine**: [Meta Demucs v4 (PyTorch)](https://github.com/facebookresearch/demucs)
- **Media Processing**: [FFmpeg Static](https://github.com/nexeck/ffmpeg-static)
- **Runtime Environment**: Node.js 18+ & Python 3.8+

---

### 🚀 Prerequisites

To run the application locally on your system, make sure the following are installed:

1. **Node.js**: Version 18.0.0 or higher ([Download Node.js](https://nodejs.org/)).
2. **Python**: Version 3.8 or higher with Python added to your system `PATH` ([Download Python](https://www.python.org/)).
3. **Meta Demucs AI Engine**:
   Install the Demucs library via terminal / command prompt:
   ```bash
   pip install -U demucs
   ```
   *(Note: Demucs will automatically download underlying PyTorch dependencies upon its first execution).*

---

### ⚙️ Quick Start (Local Setup)

#### 1. Clone the Repository
```bash
git clone https://github.com/your-username/video-music-remover.git
cd video-music-remover
```

#### 2. Install Node Dependencies
```bash
npm install
```

#### 3. Start the Local Development Server
```bash
npm run dev
```

Open your browser and navigate to:  
👉 **`http://localhost:3000`**

The app will automatically verify local environment readiness for `FFmpeg` and `Demucs AI` and display an indicator status at the top right of the studio.

---

### 🌐 Cloud & Production Deployment

#### ⚠️ Note on Vercel Showcase Deployments
The application relies on direct system child processes (`Python`, `PyTorch`, `FFmpeg`) and CPU/GPU compute to perform AI audio separation. When deployed on **Vercel**, the application serves as a design and architectural showcase interface, displaying a notice banner that local setup is required for active processing.

#### 🏗️ Options for Production Deployment

To run this application as a fully functional cloud web service, choose one of the following architectures:

##### Option A: Self-Hosted Docker Container
Create a `Dockerfile` bundling Node.js, Python 3, FFmpeg, and Demucs, then deploy to any cloud server or VPS (e.g., DigitalOcean, Hetzner, AWS EC2, or Render):
```dockerfile
FROM node:20-bullseye

# Install Python and FFmpeg dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    && rm -rf /var/lib/apt-get/lists/*

RUN pip3 install -U demucs

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

##### Option B: Microservices Architecture (Vercel UI + GPU Worker)
- **Frontend & UI**: Host on **Vercel** for fast global delivery.
- **Backend GPU Worker**: Deploy a lightweight Python API server (FastAPI/Flask) on specialized serverless GPU providers like [Modal](https://modal.com/), [RunPod](https://runpod.io/), or [Replicate](https://replicate.com/).
- Upon video upload on Vercel, the frontend dispatches the audio separation payload to the GPU worker microservice.

---

### 📄 License

This project is open-source and licensed under the **MIT License**.

<p align="center">
  Crafted with care 🌿 | Created by <b>AlMonther Abdulhafeez</b>
</p>

---
---

## 🇸🇦 النسخة العربية

> **Keep it halal bro 🌿**  
> أداة شخصية ومحلية ذات طابع عربي دافئ لعزل حديث الكلام البشري والتخلص التام من الألحان والموسيقى الخلفية في مقاطع الفيديو بخصوصية 100% وبدون الاستعانة بخوادم خارجية.

---

### ✨ المميزات الرئيسية

- 🔒 **خصوصية محلية 100%**: تتم جميع عمليات معالجة الفيديو وعزل الصوت محليًا على جهازك دون إرسال أي مقاطع أو بيانات إلى السحاب.
- 🤖 **محرك الذكاء الاصطناعي Meta Demucs AI**: يعتمد على نماذج التعلم العميق المتطورة (`HTDemucs` & `HTDemucs FT`) المطوّرة من Meta للتحليل الفصلي الدقيق لطبقات الصوت.
- ⚡ **دمج سريع عبر FFmpeg**: استخراج وإعادة دمج الصوت النقي مع مسار الفيديو الأصلي بدون إعادة ترميز الفيديوهات المعقدة للحفاظ على أعلى جودة وأسرع أداء.
- 🎨 **تصميم "عربي دافئ" (Earthy Cozy Arabic UI)**: تجربة مستخدم مخصصة تعتمد على درجات الألوان الطبيعية (Alabaster Cream, Muted Sage, Earthy Clay, Deep Espresso)، مع رسومات ونباتات شرقية وأشكال One-Line Art بسيطة.
- 🎛️ **خيارات الدقة والتحكم**: اختيار نموذج المعالجة السريعة للمقاطع اليومية أو نموذج الدقة العالية للمقاطع الاحترافية.
- 📱 **واجهة استوديو متكاملة (Headerless Single-Screen Studio)**: واجهة شاشة واحدة بدون تشتيت، تضمن سلاسة العمل وعرض التقدم اللحظي ومعاينة النتيجة قبل التنزيل.

---

### 🛠️ التكنولوجيات المستخدمة

- **Frontend**: [Next.js 16 (App Router)](https://nextjs.org/) + [React 19](https://react.dev/) + [TailwindCSS](https://tailwindcss.com/)
- **Icons & Art**: Lucide Icons + Custom SVG Botanical Line Art & Arabesque Patterns
- **Audio AI Engine**: [Meta Demucs v4 (PyTorch)](https://github.com/facebookresearch/demucs)
- **Media Processing**: [FFmpeg Static](https://github.com/nexeck/ffmpeg-static)
- **Runtime**: Node.js 18+ & Python 3.8+

---

### 🚀 متطلبات التشغيل المحلي

لتشغيل التطبيق محليًا على جهازك بنجاح، تأكد من تثبيت البرامج التالية:

1. **Node.js**: الإصدار 18.0.0 أو أحدث ([تحميل Node.js](https://nodejs.org/)).
2. **Python**: الإصدار 3.8 أو أحدث مع إضافة Python إلى متغيرات البيئة `PATH` ([تحميل Python](https://www.python.org/)).
3. **Meta Demucs AI Engine**:
   قم بتثبيت مكتبة Demucs عبر موجّه الأوامر (Terminal / Command Prompt):
   ```bash
   pip install -U demucs
   ```
   *(ملاحظة: سيقوم Demucs بتنزيل المكتبات المساندة مثل PyTorch تلقائيًا عند التشغيل لأول مرة).*

---

### ⚙️ خطوات التثبيت والتشغيل المحلي

#### 1. استنساخ المشروع (Clone Repository)
```bash
git clone https://github.com/your-username/video-music-remover.git
cd video-music-remover
```

#### 2. تثبيت الحزم والمكتبات (Install Dependencies)
```bash
npm install
```

#### 3. تشغيل خادم التطبيق المحلي (Run Development Server)
```bash
npm run dev
```

افتح المتصفح وانتقل إلى العنوان:  
👉 **`http://localhost:3000`**

سيقوم التطبيق تلقائيًا بالتحقق من جاهزية بيئة `FFmpeg` ومحرك `Demucs AI` وعرض شارة الجاهزية أعلى الاستوديو.

---

### 🌐 النشر في الإنتاج (Production & Cloud Deployment)

#### ⚠️ ملاحظة بخصوص Vercel Showcase
التطبيق يعتمد على تشغيل أوامر النظام الهيكلية (`Python`, `PyTorch`, `FFmpeg`) واستنزاف الموارد المعالجة (CPU/GPU) لفصل الصوت. عند نشر المشروع على **Vercel**، ستعمل الواجهة بشكل جميل كنسخة تجريبية (Showcase)، ولكن معالجة الفيديو الفعلية تتطلب بيئة تشغيل تمتلك Python و Demucs.

#### 🏗️ خيارات تشغيل المشروع في الإنتاج

لكي يعمل التطبيق بكامل وظائفه المعالجة في بيئة سحابية (Production)، يمكنك اتباع إحدى الطرق التالية:

##### الخيار الأول: الاستضافة الذاتية عبر Docker (Self-Hosted Docker)
أنشئ ملف `Dockerfile` يجمع بين Node.js و Python و FFmpeg و Demucs، ثم قم بنشره على أي خادم سحابي (مثل DigitalOcean, Hetzner, AWS EC2, or Render):
```dockerfile
FROM node:20-bullseye

# Install Python and FFmpeg dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    && rm -rf /var/lib/apt-get/lists/*

RUN pip3 install -U demucs

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

##### الخيار الثاني: نموذج الهندسة المنفصلة (Microservices Architecture)
- **Frontend & UI**: النشر على **Vercel** مجانًا.
- **Backend Worker**: إنشاء خدمة صغيرة (Microservice) باستخدام **FastAPI** أو **Flask** مستضافة على منصات معالجة الرسوميات الذكية مثل [Modal](https://modal.com/) أو [RunPod](https://runpod.io/) أو [Replicate](https://replicate.com/) أو [AWS ECS GPU].
- عند رفع الفيديو من الواجهة على Vercel، يتم إرسال طلب المعالجة إلى Worker الخادم وبث نسبة التقدم مجددًا إلى الواجهة.

---

### 📄 الترخيص (License)

هذا المشروع مفتوح المصدر ومتاح تحت رخصة **MIT License**.

<p align="center">
  صُنع بحب وعناية 🌿 | إعداد <b>المنذر عبد الحفيظ</b>
</p>
