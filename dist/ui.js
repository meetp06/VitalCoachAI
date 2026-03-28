import { useState, useEffect, useRef } from 'react';
import { Activity, Moon, Heart, Flame, Footprints, Zap } from 'lucide-react';
// ==========================================
// 1. CUSTOM CSS & ANIMATIONS
// ==========================================
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');

  body {
    background-color: #261B16; /* Deep outer ambient brown */
    color: #3E2D25;
    overflow: hidden; 
    margin: 0;
    padding: 0;
  }

  /* Matte Frosted Glass Cards */
  .card-floating {
    background: rgba(255, 255, 255, 0.45);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border-radius: 32px;
    box-shadow: 0 16px 40px -8px rgba(62, 45, 37, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.6);
  }

  /* Soft Chat Bubbles */
  .chat-bubble-bot {
    background: rgba(255, 255, 255, 0.55);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 24px 24px 24px 8px;
    box-shadow: 0 12px 36px -12px rgba(62, 45, 37, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.7);
  }

  .chat-bubble-user {
    background: #3E2D25;
    color: #F6F5E9;
    border-radius: 24px 24px 8px 24px;
    box-shadow: 0 12px 36px -12px rgba(62, 45, 37, 0.15);
    border: none;
  }

  /* Animations */
  .animate-fade-in-up {
    animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    opacity: 0;
    transform: translateY(24px);
  }

  .animate-draw-line {
    stroke-dasharray: 200;
    stroke-dashoffset: 200;
    animation: drawLine 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    animation-delay: 0.5s;
  }

  @keyframes fadeInUp {
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes drawLine {
    to { stroke-dashoffset: 0; }
  }

  @keyframes audioWave {
    0%, 100% { height: 4px; }
    50% { height: 16px; }
  }

  .audio-bar {
    animation: audioWave 1s ease-in-out infinite;
  }

  .scroll-hide::-webkit-scrollbar { display: none; }
  .scroll-hide { -ms-overflow-style: none; scrollbar-width: none; }
  .circle-progress { transition: stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1); }
`;
// ==========================================
// 2. MOCK DATA
// ==========================================
// Minimalist Earthy Color Palette applied here
const metricsData = [
    { id: 'sleep', label: 'SLEEP', value: '5h 06m', unit: '', target: '8h', percent: 64, icon: Moon, color: '#7A8B8B', delta: '↓ 2.4h', status: 'bad', sparkpoints: '10,20 20,40 30,30 40,50 50,20 60,30' },
    { id: 'hrv', label: 'HRV', value: '28', unit: 'ms', target: '45ms', percent: 62, icon: Activity, color: '#8E9B85', delta: '↓ 12ms', status: 'bad', sparkpoints: '10,50 20,40 30,60 40,30 50,20 60,10' },
    { id: 'glucose', label: 'GLUCOSE', value: '74', unit: 'mg/dL', target: '90', percent: 82, icon: Flame, color: '#D0A38B', delta: 'stable', status: 'good', sparkpoints: '10,30 20,35 30,30 40,40 50,35 60,30' },
    { id: 'hr', label: 'RESTING HR', value: '78', unit: 'bpm', target: '65', percent: 40, icon: Heart, color: '#B88478', delta: '↑ 12bpm', status: 'bad', sparkpoints: '10,20 20,30 30,40 40,50 50,60 60,55' },
    { id: 'steps', label: 'STEPS', value: '3,840', unit: '', target: '10k', percent: 38, icon: Footprints, color: '#A8A39D', delta: '↓ 1k', status: 'neutral', sparkpoints: '10,60 20,50 30,55 40,30 50,40 60,20' },
    { id: 'stress', label: 'STRESS', value: '62', unit: '/100', target: '30', percent: 38, icon: Zap, color: '#94878A', delta: '↑ 18%', status: 'bad', sparkpoints: '10,20 20,30 30,25 40,50 50,60 60,70' },
];
const factorsData = [
    { name: 'Sleep debt', detail: '5h 06m — about 2.4 hours below your target. Deep sleep was particularly low.', impact: 'HIGH', icon: '😴', color: 'bg-[#B88478]/20 text-[#8C5D52]' },
    { name: 'Low HRV', detail: '28ms indicates poor nervous system recovery overnight.', impact: 'HIGH', icon: '📉', color: 'bg-[#B88478]/20 text-[#8C5D52]' },
    { name: 'Low activity', detail: 'Only 3,840 steps yesterday. Sedentary behavior affecting metabolism.', impact: 'MEDIUM', icon: '🪑', color: 'bg-[#D0A38B]/30 text-[#9E735B]' },
];
// ==========================================
// 3. UTILITY HOOKS
// ==========================================
const useDynamicGreeting = () => {
    const [greetingInfo, setGreetingInfo] = useState({ greeting: 'Good day', dateString: '' });
    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            const hour = now.getHours();
            let greeting = 'Good evening';
            if (hour < 12)
                greeting = 'Good morning';
            else if (hour < 18)
                greeting = 'Good afternoon';
            const options = { weekday: 'long', month: 'long', day: 'numeric' };
            const dateString = now.toLocaleDateString('en-US', options);
            setGreetingInfo({ greeting, dateString });
        };
        updateTime();
    }, []);
    return greetingInfo;
};
// ==========================================
// 4. SHARED UI COMPONENTS
// ==========================================
const Header = () => className = "relative z-50 mx-2 sm:mx-4 lg:mx-8 mt-4 sm:mt-6 mb-6 sm:mb-8 px-2 flex justify-between items-center" >
    className;
"flex items-center gap-2 sm:gap-3" >
    className;
"w-10 h-10 rounded-full bg-[#3E2D25] flex items-center justify-center shadow-lg hover:scale-105 transition-transform cursor-pointer" >
    className;
"text-[#F6F5E9] w-5 h-5" /  >
    /div>
    < div >
    className;
"text-lg font-bold uppercase text-[#3E2D25] leading-none cursor-pointer tracking-normal" > VitalCoach < /h1>
    < /div>
    < /div>
    < div;
className = "hidden lg:flex items-center gap-8 text-[11px] font-bold tracking-widest uppercase text-[#8C7A70]" >
    className;
"text-[#3E2D25] cursor-pointer border-b-2 border-[#3E2D25] pb-1" > Dashboard < /span>
    < span;
className = "cursor-pointer hover:text-[#3E2D25] transition-colors pb-1 border-b-2 border-transparent" > Insights < /span>
    < span;
className = "cursor-pointer hover:text-[#3E2D25] transition-colors pb-1 border-b-2 border-transparent" > Activity < /span>
    < span;
className = "cursor-pointer hover:text-[#3E2D25] transition-colors pb-1 border-b-2 border-transparent" > Settings < /span>
    < /div>
    < div;
className = "flex items-center gap-3 sm:gap-4" >
    className;
"hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/60 backdrop-blur-md shadow-sm border border-white/80 cursor-pointer hover:shadow-md transition-all" >
    className;
"w-2 h-2 rounded-full bg-[#8E9B85] animate-pulse" /  >
    className;
"text-[9px] font-bold text-[#3E2D25] tracking-widest uppercase" > Demo;
Mode < /span>
    < /div>
    < div;
className = "w-10 h-10 rounded-full bg-white/60 backdrop-blur-md border border-white/80 shadow-sm flex items-center justify-center overflow-hidden cursor-pointer hover:scale-105 transition-transform" >
    className;
"text-sm font-bold text-[#3E2D25] tracking-tight" > DU < /span>
    < /div>
    < /div>
    < /header>;
;
const RadialProgress = ({ percent, color, children }) => {
    const [offset, setOffset] = useState(176);
    useEffect(() => { setTimeout(() => setOffset(176 - (percent / 100) * 176), 100); }, [percent]);
    return className = "relative w-20 h-20 flex items-center justify-center" >
        xmlns;
    "http://www.w3.org/2000/svg";
    className = "absolute inset-0 w-full h-full transform -rotate-90" >
        cx;
    "40";
    cy = "40";
    r = "28";
    fill = "none";
    stroke = "rgba(62,45,37,0.06)";
    strokeWidth = "6";
    strokeLinecap = "round" /  >
        cx;
    "40";
    cy = "40";
    r = "28";
    fill = "none";
    stroke = { color };
    strokeWidth = "6";
    strokeLinecap = "round";
    strokeDasharray = "176";
    strokeDashoffset = { offset };
    className = "circle-progress" /  >
        /svg>
        < div;
    className = "relative z-10 flex flex-col items-center justify-center" > { children } < /div>
        < /div>;
};
;
;
const Sparkline = ({ points, color }) => xmlns = "http://www.w3.org/2000/svg", className = "w-full h-10", viewBox = "0 0 70 70", preserveAspectRatio = "none" >
    fill;
"none";
stroke = { color };
strokeWidth = "3";
strokeLinecap = "round";
strokeLinejoin = "round";
points = { points };
className = "opacity-90 animate-draw-line" /  >
    /svg>;
;
const VoiceVisualizer = () => className = "flex items-center justify-center gap-1 h-8 px-4 bg-[#B88478]/10 backdrop-blur-sm rounded-full border border-[#B88478]/20" >
    className;
"w-1.5 bg-[#B88478] rounded-full audio-bar";
style = {};
{
    animationDelay: '0.0s';
}
/>
    < div;
className = "w-1.5 bg-[#8C5D52] rounded-full audio-bar";
style = {};
{
    animationDelay: '0.2s';
}
/>
    < div;
className = "w-1.5 bg-[#B88478] rounded-full audio-bar";
style = {};
{
    animationDelay: '0.4s';
}
/>
    < div;
className = "w-1.5 bg-[#8C5D52] rounded-full audio-bar";
style = {};
{
    animationDelay: '0.6s';
}
/>
    < div;
className = "w-1.5 bg-[#B88478] rounded-full audio-bar";
style = {};
{
    animationDelay: '0.8s';
}
/>
    < span;
className = "text-[10px] font-bold text-[#8C5D52] ml-2 tracking-widest uppercase" > Listening < /span>
    < /div>;
;
const DonutChart = () => {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    return className = "relative w-32 h-32 sm:w-40 sm:h-40 group cursor-pointer" >
        xmlns;
    "http://www.w3.org/2000/svg";
    viewBox = "0 0 100 100";
    className = "w-full h-full transform -rotate-90 group-hover:scale-105 transition-transform duration-500" >
        cx;
    "50";
    cy = "50";
    r = "40";
    fill = "transparent";
    stroke = "rgba(62,45,37,0.06)";
    strokeWidth = "14" /  >
        { /* Deep: 32% (Dark Brown) */}
        < circle;
    cx = "50";
    cy = "50";
    r = "40";
    fill = "transparent";
    stroke = "#3E2D25";
    strokeWidth = "14";
    strokeDasharray = "251.2";
    strokeDashoffset = { mounted, "170.8": "251.2" };
    className = "circle-progress";
    strokeLinecap = "round" /  >
        { /* Core: 36% (Mid Brown) */}
        < circle;
    cx = "50";
    cy = "50";
    r = "40";
    fill = "transparent";
    stroke = "#736157";
    strokeWidth = "14";
    strokeDasharray = "251.2";
    strokeDashoffset = { mounted, "160.8": "251.2" };
    className = "circle-progress";
    strokeLinecap = "round";
    style = {};
    {
        transform: 'rotate(115.2deg)', transformOrigin;
        '50% 50%';
    }
};
/>;
{ /* REM: 18% (Light Taupe) */ }
cx;
"50";
cy = "50";
r = "40";
fill = "transparent";
stroke = "#A6968E";
strokeWidth = "14";
strokeDasharray = "251.2";
strokeDashoffset = { mounted, "206": "251.2" };
className = "circle-progress";
strokeLinecap = "round";
style = {};
{
    transform: 'rotate(244.8deg)', transformOrigin;
    '50% 50%';
}
/>;
{ /* Awake: 14% (Greige) */ }
cx;
"50";
cy = "50";
r = "40";
fill = "transparent";
stroke = "#D4CDC6";
strokeWidth = "14";
strokeDasharray = "251.2";
strokeDashoffset = { mounted, "216": "251.2" };
className = "circle-progress";
strokeLinecap = "round";
style = {};
{
    transform: 'rotate(309.6deg)', transformOrigin;
    '50% 50%';
}
/>
    < /svg>
    < div;
className = "absolute inset-0 flex flex-col items-center justify-center group-hover:scale-105 transition-transform duration-500" >
    className;
"text-[10px] font-bold tracking-widest text-[#8C7A70]" > SCORE < /span>
    < span;
className = "text-3xl font-bold text-[#3E2D25] mt-1 tracking-tight" > 52 < /span>
    < /div>
    < /div>;
;
;
// ==========================================
// 5. MAIN PANELS (DASHBOARD & COPILOT)
// ==========================================
const DashboardPanel = ({ greeting, dateString }) => className = "w-full lg:w-[60%] lg:h-full flex flex-col scroll-hide lg:overflow-y-auto pb-6 sm:pb-10 lg:pr-4 shrink-0" >
    className;
"mb-8 sm:mb-10 animate-fade-in-up";
style = {};
{
    animationDelay: '0.1s';
}
 >
    className;
"inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/60 backdrop-blur-md border border-white/80 text-[#3E2D25] text-[9px] font-bold tracking-widest uppercase mb-4 shadow-sm" >
    size;
{
    12;
}
className = "text-[#8C7A70]" /  > { dateString }
    < /div>;
{ /* Editorial Monospace typography applied globally now affects this perfectly */ }
className;
"text-3xl sm:text-[42px] font-bold text-[#3E2D25] leading-[1.2] uppercase tracking-normal" >
    { greeting }. < br /  > Embark;
on;
your < br /  > health;
journey.
    < /h2>
    < /div>;
{ /* AI Insight Banner */ }
id;
"insight-banner";
className = "card-floating p-8 mb-10 animate-fade-in-up relative overflow-hidden group cursor-pointer";
style = {};
{
    animationDelay: '0.2s';
}
 >
    className;
"absolute right-0 top-0 w-32 h-32 bg-[#EFEBE4] rounded-bl-full opacity-60 group-hover:scale-110 transition-transform duration-700 pointer-events-none" /  >
    className;
"flex flex-col md:flex-row gap-6 items-start relative z-10" >
    className;
"w-16 h-16 rounded-full bg-[#3E2D25] flex items-center justify-center shrink-0 shadow-lg group-hover:scale-105 transition-transform" >
    className;
"text-[#F6F5E9] w-8 h-8" /  >
    /div>
    < div >
    className;
"flex items-center gap-2 mb-2" >
    className;
"bg-white/60 border border-white/80 text-[#3E2D25] text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full shadow-sm" >
;
AI;
Insight
    < /span>
    < /div>
    < h3;
className = "text-lg sm:text-xl font-bold text-[#3E2D25] mb-3 group-hover:text-[#736157] transition-colors" >
    Why;
do
    I;
while (feel);
so;
fatigued;
today ?
    /h3>
        < p : ;
className = "text-[13px] text-[#736157] font-medium leading-relaxed max-w-xl" >
    You;
have;
a < strong;
className = "text-[#8C5D52] font-bold" > significant;
sleep;
debt < /strong> (-2.4h) compounding with yesterday's <strong className="text-[#9E735B] font-bold">high screen stimulation</strong > .This;
has;
crashed;
your;
HRV;
to;
28;
ms, putting;
your;
nervous;
system in a;
defensive;
state.
    < /p>
    < /div>
    < /div>
    < /div>;
{ /* Metrics Grid */ }
id;
"metrics-grid";
className = "grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5 mb-10" >
    { metricsData, : .map((metric, i) => key = { metric, : .id }, className = {} `card-floating p-4 sm:p-6 flex flex-col justify-between animate-fade-in-up transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-10px_rgba(62,45,37,0.1)] group relative overflow-hidden cursor-pointer`) };
style = {};
{
    animationDelay: `${0.3 + (i * 0.1)}s`;
}
 >
    className;
"flex justify-between items-start mb-4 sm:mb-6" >
    className;
"flex items-center gap-2" >
    className;
"w-8 h-8 rounded-full flex items-center justify-center bg-white/60 backdrop-blur-sm group-hover:scale-110 transition-transform" >
    size;
{
    14;
}
style = {};
{
    color: metric.color;
}
/>
    < /div>
    < span;
className = "text-[8px] sm:text-[10px] font-bold tracking-widest text-[#8C7A70] uppercase group-hover:text-[#3E2D25] transition-colors" > { metric, : .label } < /span>
    < /div>
    < div;
className = {} `px-2 py-1 sm:px-2.5 sm:py-1 rounded-full text-[8px] sm:text-[9px] font-bold flex items-center gap-1 uppercase tracking-wider ${metric.status === 'bad' ? 'bg-[#B88478]/20 text-[#8C5D52]' : metric.status === 'good' ? 'bg-[#8E9B85]/20 text-[#5F6B58]' : 'bg-white/60 text-[#736157]'}`;
 >
    { metric, : .delta }
    < /div>
    < /div>
    < div;
className = "flex items-end justify-between" >
    className;
"mb-1" >
    className;
"flex items-baseline gap-1" >
    className;
"text-xl sm:text-2xl font-bold text-[#3E2D25] leading-none tracking-tight" > { metric, : .value } < /span>
    < span;
className = "text-[10px] sm:text-xs font-semibold text-[#8C7A70]" > { metric, : .unit } < /span>
    < /div>
    < /div>
    < RadialProgress;
percent = { metric, : .percent };
color = { metric, : .color } >
    className;
"text-[10px] font-bold text-[#3E2D25]" > { metric, : .percent } % /span>
    < /RadialProgress>
    < /div>
    < div;
className = "mt-4 pt-4 border-t border-white/40" >
    className;
"w-full h-8 opacity-60 group-hover:opacity-100 transition-opacity" >
    points;
{
    metric.sparkpoints;
}
color = { metric, : .color } /  >
    /div>
    < /div>
    < /div>;
/div>
    < div;
className = "grid grid-cols-1 md:grid-cols-2 gap-6 mb-8" >
    { /* Contributing Factors */}
    < div;
id = "contributing-factors";
className = "card-floating p-6 sm:p-8 animate-fade-in-up";
style = {};
{
    animationDelay: '0.9s';
}
 >
    className;
"text-[10px] font-bold tracking-widest text-[#8C7A70] uppercase mb-6 sm:mb-8" > Contributing;
Factors < /h4>
    < div;
className = "flex flex-col gap-6" >
    { factorsData, : .map((factor, i) => key = { i }, className = "flex gap-4 group cursor-pointer" >
            className, "w-12 h-12 rounded-full bg-white/60 backdrop-blur-sm flex items-center justify-center text-xl shrink-0 group-hover:bg-white transition-all" >
            { factor, : .icon }
            < /div>
            < div >
            className, "flex items-center gap-2 mb-1.5" >
            className, "font-bold text-[#3E2D25] text-[12px] group-hover:text-[#736157] transition-colors" > { factor, : .name } < /h5>
            < span, className = {} `text-[8px] font-bold px-2 py-0.5 rounded-full tracking-widest ${factor.color}`) } >
    { factor, : .impact }
    < /span>
    < /div>
    < p;
className = "text-xs text-[#736157] font-medium leading-relaxed" > { factor, : .detail } < /p>
    < /div>
    < /div>;
/div>
    < /div>;
{ /* Sleep Breakdown */ }
id;
"sleep-card";
className = "card-floating p-6 sm:p-8 flex flex-col items-center justify-center animate-fade-in-up relative";
style = {};
{
    animationDelay: '1.0s';
}
 >
    className;
"text-[10px] font-bold tracking-widest text-[#8C7A70] uppercase w-full text-left absolute top-6 sm:top-8 left-6 sm:left-8" > Sleep;
Breakdown < /h4>
    < div;
className = "mt-10 sm:mt-8 mb-6" > /></div >
    className;
"w-full flex flex-col gap-3 mt-4" >
    className;
"flex items-center justify-between text-xs group cursor-pointer hover:bg-white/40 p-1.5 rounded-lg transition-colors" >
    className;
"flex items-center gap-2" > className;
"w-2.5 h-2.5 rounded-full bg-[#3E2D25] group-hover:scale-125 transition-transform" /  > className;
"font-medium text-[#736157]" > Deep;
Sleep < /span></div >
    className;
"font-bold text-[#3E2D25]" > 32 % /span>
    < /div>
    < div;
className = "flex items-center justify-between text-xs group cursor-pointer hover:bg-white/40 p-1.5 rounded-lg transition-colors" >
    className;
"flex items-center gap-2" > className;
"w-2.5 h-2.5 rounded-full bg-[#736157] group-hover:scale-125 transition-transform" /  > className;
"font-medium text-[#736157]" > Core;
Sleep < /span></div >
    className;
"font-bold text-[#3E2D25]" > 36 % /span>
    < /div>
    < div;
className = "flex items-center justify-between text-xs group cursor-pointer hover:bg-white/40 p-1.5 rounded-lg transition-colors" >
    className;
"flex items-center gap-2" > className;
"w-2.5 h-2.5 rounded-full bg-[#A6968E] group-hover:scale-125 transition-transform" /  > className;
"font-medium text-[#736157]" > REM;
Sleep < /span></div >
    className;
"font-bold text-[#3E2D25]" > 18 % /span>
    < /div>
    < /div>
    < /div>
    < /div>
    < /div>;
;
const CopilotPanel = ({ messages, input, setInput, handleSend, handleAction, isTyping, isRecording, messagesEndRef }) => className = "w-full lg:w-[40%] h-[600px] lg:h-full flex flex-col card-floating overflow-hidden relative animate-fade-in-up shrink-0", style = {}, { animationDelay: , '0.4s':  };
 >
    { /* Chat Header */}
    < div;
className = "px-6 sm:px-8 py-4 sm:py-6 border-b border-white/40 flex justify-between items-center z-10 bg-white/20 backdrop-blur-md" >
    className;
"flex items-center gap-3" >
    className;
"w-8 h-8 rounded-full bg-white/80 shadow-sm flex items-center justify-center" >
    size;
{
    14;
}
className = "text-[#3E2D25]" /  >
    /div>
    < h3;
className = "font-bold text-[#3E2D25] text-sm tracking-tight" > Copilot < /h3>
    < /div>
    < div;
className = "bg-white/60 px-3 py-1.5 rounded-full text-[9px] font-bold text-[#8C7A70] tracking-widest flex items-center gap-1.5 uppercase cursor-pointer hover:bg-white transition-colors border border-white/80" >
    size;
{
    12;
}
/> Assistant UI
    < /div>
    < /div>;
{ /* Messages Area */ }
id;
"chat-messages";
className = "flex-1 overflow-y-auto p-8 scroll-hide flex flex-col gap-8 bg-transparent" >
    { messages, : .map((msg, idx) => key = { idx }, className = {} `flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'animate-fade-in-up'} `) };
style = {};
{
    animationDelay: '0s';
}
 >
    { msg, : .role === 'assistant' && className, "w-10 h-10 rounded-full bg-[#3E2D25] text-[#F6F5E9] flex items-center justify-center shrink-0 shadow-md":  >  } < /div>;
className;
{
    `max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-3`;
}
 >
    { msg, : .content && className };
{
    `px-5 py-4 text-[12px] font-medium leading-relaxed
                ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-bot text-[#3E2D25]'}`;
}
 >
    { msg, : .content }
    < /div>;
{ /* Dynamic Card Rendering */ }
{
    msg.type === 'correlation' && className;
    "chat-bubble-bot p-6 w-full hover:shadow-lg transition-shadow cursor-default" >
        className;
    "flex items-center gap-2 mb-3 text-[#3E2D25]" >
        size;
    {
        18;
    }
    />
        < span;
    className = "text-[10px] font-bold tracking-widest uppercase" > Correlation < /span>
        < /div>
        < p;
    className = "text-[13px] text-[#3E2D25] mb-5 font-semibold leading-relaxed" > Poor;
    sleep + low;
    HRV;
    are;
    working;
    together, creating;
    compound;
    fatigue. < /p>
        < div;
    className = "bg-white/60 rounded-2xl p-4 flex items-center justify-between border border-white/50" >
        className;
    "text-[11px] font-bold text-[#8C7A70] uppercase tracking-wider" > Confidence < /span>
        < div;
    className = "flex items-center gap-3" >
        className;
    "w-24 h-2 bg-white/80 rounded-full overflow-hidden" >
        className;
    "h-full bg-[#3E2D25] w-[88%] animate-[growWidth_1s_ease-out_forwards]" /  >
        /div>
        < span;
    className = "text-[11px] font-bold text-[#3E2D25]" > 88 % /span>
        < /div>
        < /div>
        < /div>;
}
{
    msg.type === 'meal' && className;
    "chat-bubble-bot p-6 w-full hover:shadow-lg transition-shadow cursor-default" >
        className;
    "flex items-center gap-2 mb-4 text-[#3E2D25]" >
        size;
    {
        18;
    }
    />
        < span;
    className = "text-[10px] font-bold tracking-widest uppercase" > Meal;
    Analysis < /span>
        < /div>
        < div;
    className = "bg-white/60 border border-white/50 rounded-2xl p-4 mb-4" >
        className;
    "grid grid-cols-2 gap-y-3 gap-x-2 text-[11px]" >
        className;
    "flex justify-between pr-2" > className;
    "text-[#736157]" > Calories < /span> <span className="font-bold text-[#3E2D25]">480</span > /div>
        < div;
    className = "flex justify-between pl-2" > className;
    "text-[#736157]" > Protein < /span> <span className="font-bold text-[#3E2D25]">38g</span > /div>
        < div;
    className = "flex justify-between pr-2" > className;
    "text-[#736157]" > Carbs < /span> <span className="font-bold text-[#3E2D25]">52g</span > /div>
        < div;
    className = "flex justify-between pl-2" > className;
    "text-[#736157]" > Fat < /span> <span className="font-bold text-[#3E2D25]">12g</span > /div>
        < /div>
        < /div>
        < p;
    className = "text-[12px] text-[#736157] font-medium leading-relaxed" >
    ;
    Good;
    protein - to - carb;
    ratio.The;
    fiber;
    from;
    broccoli;
    will;
    help;
    moderate;
    the;
    glucose;
    spike.Load;
    estimate: className;
    "text-[#D0A38B]" > Moderate(~18) < /strong>.
        < /p>
        < /div>;
}
{
    msg.type === 'voice' && className;
    "chat-bubble-user p-6 w-full hover:shadow-lg transition-shadow cursor-default" >
        className;
    "flex items-center gap-2 mb-3 text-[#F6F5E9]/70" >
        size;
    {
        16;
    }
    />
        < span;
    className = "text-[10px] font-bold tracking-widest uppercase" > Voice;
    Check -  in /span>
        < /div>
        < p;
    className = "text-[13px] font-medium italic mb-5 leading-relaxed" > "I feel really sluggish this morning and my muscles ache." < /p>
        < div;
    className = "flex gap-2" >
        className;
    "bg-white/10 px-3 py-1.5 rounded-full text-[9px] font-bold tracking-widest hover:bg-white/20 transition-colors" > ENERGY;
    LOW < /span>
        < span;
    className = "bg-white/10 px-3 py-1.5 rounded-full text-[9px] font-bold tracking-widest hover:bg-white/20 transition-colors" > STRESS;
    MODERATE < /span>
        < /div>
        < /div>;
}
{
    msg.type === 'action' && className;
    "chat-bubble-bot border-l-[6px] border-l-[#3E2D25] border-y-0 border-r-0 rounded-l-md p-6 w-full hover:shadow-lg transition-shadow cursor-default" >
        className;
    "flex items-center gap-2 mb-5 text-[#3E2D25]" >
        size;
    {
        18;
    }
    />
        < span;
    className = "text-[10px] font-bold tracking-widest uppercase" > Action;
    Plan < /span>
        < /div>
        < div;
    className = "space-y-4" >
        className;
    "flex items-start gap-3.5 group" >
        className;
    "w-8 h-8 rounded-full bg-white/80 flex items-center justify-center text-lg shrink-0 group-hover:bg-white transition-colors" > ;
    /div>
        < div >
        className;
    "text-[12px] font-bold text-[#3E2D25]" > Hydrate;
    with (electrolytes < /p>
        < p)
        className = "text-[11px] font-medium text-[#736157] mt-1" > Your;
    HRV;
    indicates;
    dehydration;
    stress. < /p>
        < /div>
        < /div>
        < div;
    className = "w-full h-px bg-white/60" /  >
        className;
    "flex items-start gap-3.5 group" >
        className;
    "w-8 h-8 rounded-full bg-white/80 flex items-center justify-center text-lg shrink-0 group-hover:bg-white transition-colors" > ;
    /div>
        < div >
        className;
    "text-[12px] font-bold text-[#3E2D25]" > Screens;
    off;
    by;
    9;
    30;
    PM < /p>
        < p;
    className = "text-[11px] font-medium text-[#736157] mt-1" > Give;
    melatonin;
    90 + mins;
    to;
    build;
    up;
    naturally. < /p>
        < /div>
        < /div>
        < /div>
        < /div>;
}
/div>
    < /div>;
{
    isTyping && className;
    "flex gap-4 animate-fade-in-up";
    style = {};
    {
        animationDelay: '0s';
    }
}
 >
    className;
"w-10 h-10 rounded-full bg-[#3E2D25] text-[#F6F5E9] flex items-center justify-center shrink-0" > ;
/div>
    < div;
className = "chat-bubble-bot px-5 py-5 flex gap-1.5 items-center" >
    className;
"w-2 h-2 bg-[#8C7A70] rounded-full animate-bounce";
style = {};
{
    animationDelay: '0ms';
}
/>
    < div;
className = "w-2 h-2 bg-[#8C7A70] rounded-full animate-bounce";
style = {};
{
    animationDelay: '150ms';
}
/>
    < div;
className = "w-2 h-2 bg-[#8C7A70] rounded-full animate-bounce";
style = {};
{
    animationDelay: '300ms';
}
/>
    < /div>
    < /div>;
ref;
{
    messagesEndRef;
}
/>
    < /div>;
{ /* Input Area */ }
className;
"p-4 sm:p-6 bg-white/40 backdrop-blur-md border-t border-white/50 z-10" >
    className;
"flex gap-3 mb-4 overflow-x-auto scroll-hide pb-2" >
    id;
"btn-analyze";
onClick = {}();
handleAction('analyze');
className = "shrink-0 bg-white/80 shadow-sm border border-white px-4 py-2 rounded-full text-[11px] font-bold text-[#3E2D25] flex items-center gap-2 hover:bg-white transition-all" >
    size;
{
    14;
}
className = "text-[#3E2D25]" /  > Analyze;
Data
    < /button>
    < button;
id = "btn-meal";
onClick = {}();
handleAction('meal');
className = "shrink-0 bg-white/80 shadow-sm border border-white px-4 py-2 rounded-full text-[11px] font-bold text-[#3E2D25] flex items-center gap-2 hover:bg-white transition-all" >
    size;
{
    14;
}
className = "text-[#3E2D25]" /  > Meal;
Photo
    < /button>
    < /div>
    < form;
onSubmit = { handleSend };
id = "chat-input";
className = "relative flex items-center" >
    {};
placeholder = "Ask your copilot...";
className = "w-full bg-white/60 backdrop-blur-md border border-white/80 rounded-full py-4 pl-5 pr-28 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-[#3E2D25]/20 focus:bg-white transition-all placeholder:text-[#8C7A70] text-[#3E2D25]"
    /  >
;
className;
"absolute right-2 flex items-center gap-1" >
    {};
isRecording && type;
"button";
id = "btn-camera";
className = "p-2.5 text-[#8C7A70] hover:text-[#3E2D25] transition-colors" >
    size;
{
    20;
}
/>
    < /button>;
type;
"button";
id = "btn-mic";
onClick = {}();
handleAction('checkin');
className = {} `p-2.5 transition-all relative ${isRecording ? 'text-[#8C5D52]' : 'text-[#8C7A70] hover:text-[#3E2D25]'}`;
    >
        size;
{
    20;
}
className = "relative z-10" /  >
    /button>;
{
    !isRecording && type;
    "submit";
    id = "btn-send";
    disabled = {};
    input.trim();
}
className = {} `w-10 h-10 ml-1 rounded-full flex items-center justify-center transition-all shadow-md ${input.trim() ? 'bg-[#3E2D25] text-[#F6F5E9] transform hover:scale-105' : 'bg-white/80 text-[#8C7A70] shadow-none'}`;
    >
        size;
{
    16;
}
className = "ml-0.5" /  >
    /button>;
/div>
    < /form>
    < /div>
    < /div>;
;
// ==========================================
// 6. MAIN APP COMPONENT
// ==========================================
const App = () => {
    const { greeting, dateString } = useDynamicGreeting();
    const [messages, setMessages] = useState([
        { role: 'assistant', type: 'text', content: 'Good morning! I noticed your HRV is down to 28ms today. Would you like a quick analysis of what might be causing it, or do you want to do a voice check-in?' }
    ]);
    const [input, setInput] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);
    const handleAction = (action) => {
        if (action === 'analyze') {
            addUserMessage('Analyze my data');
            simulateBotResponse('correlation');
        }
        else if (action === 'meal') {
            addUserMessage('📸 Uploaded: breakfast_bowl.jpg');
            simulateBotResponse('meal');
        }
        else if (action === 'checkin') {
            if (isRecording)
                return; // prevent double clicks
            setIsRecording(true);
            setTimeout(() => {
                setIsRecording(false);
                addUserMessage('🎤 "I feel really sluggish this morning and my muscles ache."');
                simulateBotResponse('voice');
            }, 3000);
        }
    };
    const handleSend = (e) => {
        e.preventDefault();
        if (!input.trim())
            return;
        addUserMessage(input);
        setInput('');
        simulateBotResponse('text');
    };
    const addUserMessage = (text) => setMessages(prev => [...prev, { role: 'user', content: text }]);
    const simulateBotResponse = (type) => {
        setIsTyping(true);
        setTimeout(() => {
            setIsTyping(false);
            if (type === 'correlation') {
                setMessages(prev => [...prev, { role: 'assistant', type: 'correlation' }]);
            }
            else if (type === 'meal') {
                setMessages(prev => [...prev, { role: 'assistant', type: 'meal' }]);
            }
            else if (type === 'voice') {
                setMessages(prev => [...prev, { role: 'assistant', type: 'voice' }]);
                setTimeout(() => setMessages(prev => [...prev, { role: 'assistant', type: 'action' }]), 1500);
            }
            else {
                setMessages(prev => [...prev, { role: 'assistant', type: 'text', content: "I've noted that. Based on your current data, I'd suggest prioritizing rest tonight. Let me know if you need a modified workout plan." }]);
            }
        }, 1500);
    };
    return (
    // The font override here forces the entire app to adopt the beautiful 'IBM Plex Mono' font, bypassing any default framework fonts.
    className) = "min-h-[100dvh] bg-[#261B16] sm:p-4 lg:p-8 flex items-center justify-center";
    style = {};
    {
        fontFamily: "'IBM Plex Mono', monospace";
    }
};
 >
    dangerouslySetInnerHTML;
{
    {
        __html: styles;
    }
}
/>
    < div;
className = "w-full max-w-[1500px] h-[100dvh] sm:h-[92vh] bg-[#F6F5E9] sm:rounded-[48px] sm:shadow-2xl relative overflow-hidden flex flex-col sm:border-[8px] border-0 border-[#3E2D25]" >
    />
    < main;
className = "flex-1 flex flex-col lg:flex-row gap-6 sm:gap-8 px-4 sm:px-6 lg:px-10 pb-24 lg:pb-20 overflow-y-auto lg:overflow-hidden relative z-10" >
    greeting;
{
    greeting;
}
dateString = { dateString } /  >
    messages;
{
    messages;
}
input = { input };
setInput = { setInput };
handleSend = { handleSend };
handleAction = { handleAction };
isTyping = { isTyping };
isRecording = { isRecording };
messagesEndRef = { messagesEndRef }
    /  >
    /main>
    < div;
id = "sponsor-bar";
className = "absolute bottom-4 sm:bottom-6 left-1/2 transform -translate-x-1/2 flex items-center justify-center w-full px-4 gap-4 sm:gap-8 z-50" >
    className;
"flex items-center gap-1 sm:gap-2 text-[#8C7A70] hover:text-[#3E2D25] transition-colors cursor-pointer" >
    size;
{
    14;
}
className = "shrink-0" /  > className;
"text-[8px] sm:text-[9px] font-bold tracking-widest uppercase" > DeepMind < /span>
    < /div>
    < div;
className = "flex items-center gap-1 sm:gap-2 text-[#8C7A70] hover:text-[#3E2D25] transition-colors cursor-pointer" >
    size;
{
    14;
}
className = "shrink-0" /  > className;
"text-[8px] sm:text-[9px] font-bold tracking-widest uppercase" > Nexla < /span>
    < /div>
    < div;
className = "flex items-center gap-1 sm:gap-2 text-[#8C7A70] hover:text-[#3E2D25] transition-colors cursor-pointer" >
    size;
{
    14;
}
className = "shrink-0" /  > className;
"text-[8px] sm:text-[9px] font-bold tracking-widest uppercase" > Assistant;
UI < /span>
    < /div>
    < div;
className = "hidden sm:flex items-center gap-1 sm:gap-2 text-[#8C7A70] hover:text-[#3E2D25] transition-colors cursor-pointer" >
    size;
{
    14;
}
className = "shrink-0" /  > className;
"text-[8px] sm:text-[9px] font-bold tracking-widest uppercase" > DigitalOcean < /span>
    < /div>
    < /div>
    < /div>
    < /div>;
;
;
export default App;
