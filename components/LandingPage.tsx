import React, { useEffect, useRef, useState, useCallback } from 'react';
import Matter from 'matter-js';

const { Engine, Bodies, Composite, Body } = Matter;

// ─── Tasks ────────────────────────────────────────────────────────────────────
const SAMPLE_TASKS = [
    // Work
    'Review Q4 budget','Update project timeline','Fix login bug','Deploy to staging',
    'Write release notes','Review pull request','Update dependencies','Fix broken tests',
    'Schedule team standup','Reply to client email','Send weekly report','Book meeting room',
    'Prepare slide deck','Update roadmap','Review design mockups','Fix CSS bug',
    'Update API docs','Deploy to production','Write unit tests','Review user feedback',
    'Update onboarding flow','Fix memory leak','Schedule performance review','Reply to Slack thread',
    'Send invoice #102','Book conference call','Prepare sprint backlog','Update error handling',
    'Review analytics','Fix broken link','Schedule demo call','Reply to support ticket',
    'Send status update','Book team lunch','Prepare quarterly report','Update sitemap',
    'Fix redirect loop','Schedule code review','Reply to recruiter','Send contract',
    'Book office supplies','Prepare budget proposal','Update changelog','Fix responsive layout',
    'Schedule 1:1','Reply to review comments','Send project brief','Prepare onboarding doc',
    'Update user stories','Fix caching issue','Schedule retro','Send NDA',
    'Prepare technical spec','Update pricing page','Fix authentication','Schedule launch',
    'Reply to partnership email','Send follow-up','Prepare case study','Update help docs',
    'Fix payment flow','Schedule training','Send invoice reminder','Book accountant',
    'Prepare demo script','Update privacy policy','Fix checkout bug','Schedule board meeting',
    'Reply to investor','Send welcome email','Prepare pitch deck','Update terms of service',
    'Fix data migration','Schedule product review','Reply to customer','Send proposal',
    'Prepare meeting agenda','Fix SQL query','Schedule design review','Reply to contractor',
    'Update the wiki','Rotate API keys','Archive old tickets','Review error logs',
    'Update test coverage','Write migration script','Review security audit','Close sprint',
    'Tag the release','Merge develop to main','Update staging env','Clear build cache',
    'Review SEO report','Audit accessibility','Update font stack','Compress images',
    'Minify CSS bundle','Check broken redirects','Update meta descriptions','Review A/B test',
    // Personal
    'Call dentist','Buy groceries','Walk the dog','Clean the house','Pay rent',
    'Renew passport','Pick up prescription','Fix leaking faucet','Cancel gym membership',
    'Schedule haircut','Call mom','Order birthday cake','Clean the garage','Pay electricity bill',
    'Renew car insurance','Pick up dry cleaning','Fix squeaky door','Cancel Netflix',
    'Schedule car service','Call dad','Order new glasses','Clean the oven','Pay phone bill',
    "Renew driver's license",'Pick up kids from school','Fix broken screen','Schedule eye exam',
    'Call bank','Order Christmas gifts','Clean the fridge','Pay parking ticket',
    'Pick up takeout','Fix running toilet','Schedule dental cleaning','Call landlord',
    'Order office chair','Clean windows','Pay credit card','Pick up medication',
    'Fix bike tyre','Schedule vet appointment','Call insurance','Order birthday flowers',
    'Clean under the bed','Pay water bill','Pick up parcel','Fix the fence',
    'Schedule massage','Call plumber','Order grocery delivery','Clean the car',
    'Pay council tax','Pick up school photos','Fix doorbell','Schedule blood test',
    'Call electrician','Order new pillows','Clean the bathroom','Pay internet bill',
    'Pick up keys','Fix garage door','Call broadband provider','Order printer ink',
    'Clean the patio','Pay gas bill','Fix garden tap','Buy new towels',
    'Schedule car wash','Clean the gutters','Pay late fee','Book restaurant',
    'Order new headphones','Cancel free trial','Plan weekend trip',
    // Health
    'Gym at 6pm','Morning run','Yoga class','Book physio','Order supplements',
    'Meal prep Sunday','Track calories','Book blood test','Refill vitamins',
    'Book chiropractor','Stretch routine','Book dermatologist','Drink 2L water',
    'Take medication','Book eye test','Pack gym bag','Cook healthy dinner',
    'Book therapist','Meditate 10 min','Book dietitian','Morning walk',
    'Swim session','Take iron tablets','Check heart rate','Log workouts',
    'Book flu shot','Renew gym membership','Buy protein powder','Foam roll tonight',
    'Book sports massage','Sleep by 10pm','Limit screen time','Cut sugar this week',
    // Finance
    'File tax return','Review investments','Update budget spreadsheet','Check credit score',
    'Transfer to savings','Review pension','Pay off credit card','Review insurance',
    'Cancel old bank account','Check mortgage rate','Review utility bills','File expense report',
    'Update financial plan','Review subscriptions','Review loan terms','Check interest rates',
    'Update will','Review emergency fund','Pay estimated taxes','Rebalance portfolio',
    'Check dividend income','Close dormant account','Review stock options','File VAT return',
    'Update beneficiaries','Review 401k','Check crypto portfolio','Pay contractor',
    // Learning
    'Study for exam','Read design book','Watch tutorial series','Complete online course',
    'Practice Spanish','Read newsletter','Watch conference talk','Study algorithms',
    'Read product doc','Practice piano','Learn Excel shortcuts','Read autobiography',
    'Watch documentary','Study design patterns','Read case study','Learn Figma',
    'Read history book','Watch cooking tutorial','Study for certification','Take notes',
    'Finish Duolingo streak','Review flashcards','Watch YouTube lecture','Join webinar',
    'Read research paper','Complete coding challenge','Listen to podcast','Read chapter 5',
    // Home
    'Buy lightbulbs','Fix garden fence','Clean gutters','Plant new flowers',
    'Paint bedroom wall','Buy new doormat','Fix washing machine','Clean air filters',
    'Buy new pillows','Fix radiator','Clean dishwasher','Buy bath towels',
    'Clean wine glasses','Buy kitchen mat','Fix patio paving','Hang curtains',
    'Assemble shelving','Deep clean bathroom','Replace shower head','Buy new lamp',
    'Fix loose tile','Oil the hinges','Re-grout the shower','Patch the drywall',
    'Touch up paint','Replace door handle','Fix loose plug','Buy storage boxes',
    'Declutter wardrobe','Donate old clothes','Recycle electronics','Book skip hire',
    // Social & admin
    'RSVP dinner','Back up laptop','Buy birthday gift','Water the plants',
    'Write newsletter','Take out the trash','Doctor follow-up','Clean the desk',
    'Prepare slides','Send thank-you note','Book travel insurance','Update LinkedIn',
    'Reply to DMs','Plan birthday party','Write recommendation','Confirm attendance',
    'Send holiday card','Update emergency contacts','Register to vote','Renew library card',
    'Apply for grant','Submit timesheet','Update profile photo','Check voicemail',
    'Reply to comments','Follow up on quote','Confirm reservation','Archive old emails',
];

const COLORS = [
    '#e0f2fe', '#dbeafe', '#ede9fe', '#fce7f3',
    '#d1fae5', '#fef9c3', '#ffedd5', '#fee2e2',
    '#f0fdf4', '#fdf4ff', '#e0e7ff', '#ccfbf1',
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface BubbleData {
    body: Matter.Body;
    text: string;
    color: string;
    fontSize: number;
    w: number;
    h: number;
    dumping: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function drawPill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    const r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(x + r, y + h);
    ctx.arc(x + r, y + r, r, Math.PI / 2, -Math.PI / 2);
    ctx.closePath();
}

const measureCtx = document.createElement('canvas').getContext('2d')!;
function measureBubble(text: string, fontSize: number): { w: number; h: number } {
    measureCtx.font = `700 ${fontSize}px "Plus Jakarta Sans", sans-serif`;
    const padX = 30, padY = 18;
    return { w: measureCtx.measureText(text).width + padX * 2, h: fontSize + padY * 2 };
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SPAWN_INTERVAL = 103;
const MAX_BUBBLES    = 400;
const WALL_THICKNESS = 80;

// ─── Component ────────────────────────────────────────────────────────────────
interface LandingPageProps { onGetStarted: () => void; }

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
    const canvasRef    = useRef<HTMLCanvasElement>(null);
    const engineRef    = useRef<Matter.Engine | null>(null);
    const bubblesRef   = useRef<BubbleData[]>([]);
    const wallsRef     = useRef<Matter.Body[]>([]);
    const animRef      = useRef<number>(0);
    const lastSpawnRef = useRef<number>(0);
    const hasDumpedRef = useRef(false);

    const [phase, setPhase] = useState<'falling' | 'dumped'>('falling');

    // ── Spawn ─────────────────────────────────────────────────────────────────
    const spawnBubble = useCallback((canvas: HTMLCanvasElement): void => {
        const engine = engineRef.current;
        if (!engine) return;
        if (bubblesRef.current.filter(b => !b.dumping).length >= MAX_BUBBLES) return;

        const text = SAMPLE_TASKS[Math.floor(Math.random() * SAMPLE_TASKS.length)];
        const fontSize = 20 + Math.floor(Math.random() * 7);
        const { w, h } = measureBubble(text, fontSize);

        const margin = w / 2 + 10;
        const x = margin + Math.random() * (canvas.width - margin * 2);
        const y = -h / 2 - Math.random() * 120;

        const body = Bodies.rectangle(x, y, w, h, {
            restitution: 0.35,
            friction:    0.65,
            frictionAir: 0.012,
            density:     0.002,
            chamfer:     { radius: Math.min(h / 2, 16) },
        });
        Body.setAngle(body,    (Math.random() - 0.5) * 0.35);
        Body.setVelocity(body, { x: (Math.random() - 0.5) * 3, y: 10 + Math.random() * 10 });

        Composite.add(engine.world, body);
        bubblesRef.current.push({
            body, text, fontSize, w, h,
            color:   COLORS[Math.floor(Math.random() * COLORS.length)],
            dumping: false,
        });
    }, []);

    // ── Engine + loop ─────────────────────────────────────────────────────────
    useEffect(() => {
        const canvas = canvasRef.current!;
        const ctx    = canvas.getContext('2d')!;

        const init = (): void => {
            canvas.width  = window.innerWidth;
            canvas.height = window.innerHeight;
            if (engineRef.current) {
                Engine.clear(engineRef.current);
                Composite.clear(engineRef.current.world, false);
            }
            const engine = Engine.create({ gravity: { x: 0, y: 1.4 } });
            engineRef.current = engine;
            bubblesRef.current = [];

            const W = canvas.width, H = canvas.height, T = WALL_THICKNESS;
            const floor = Bodies.rectangle(W / 2,     H + T / 2,   W * 3, T,    { isStatic: true, friction: 0.5 });
            const wallL = Bodies.rectangle(-T / 2,    H / 2,       T,     H * 4, { isStatic: true, friction: 0.5 });
            const wallR = Bodies.rectangle(W + T / 2, H / 2,       T,     H * 4, { isStatic: true, friction: 0.5 });
            wallsRef.current = [floor, wallL, wallR];
            Composite.add(engine.world, [floor, wallL, wallR]);
        };

        init();
        window.addEventListener('resize', init);

        let lastTime = performance.now();
        const animate = (now: number): void => {
            const delta = Math.min(now - lastTime, 50);
            lastTime = now;
            Engine.update(engineRef.current!, delta);

            if (!hasDumpedRef.current && now - lastSpawnRef.current > SPAWN_INTERVAL) {
                spawnBubble(canvas);
                lastSpawnRef.current = now;
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Prune bubbles that have fallen off screen
            bubblesRef.current = bubblesRef.current.filter(
                b => b.body.position.y < canvas.height + 400
            );

            for (const b of bubblesRef.current) {
                const { x, y } = b.body.position;
                const angle = b.body.angle;

                // Fade as they cross the bottom edge during dump
                const fadeStart = canvas.height - 40;
                const fadeEnd   = canvas.height + 300;
                const opacity   = b.dumping
                    ? Math.max(0, 1 - (y - fadeStart) / (fadeEnd - fadeStart))
                    : 1;
                if (opacity <= 0) continue;

                ctx.save();
                ctx.globalAlpha = opacity;
                ctx.translate(x, y);
                ctx.rotate(angle);

                const hw = b.w / 2, hh = b.h / 2;

                ctx.shadowColor   = 'rgba(0,0,0,0.13)';
                ctx.shadowBlur    = 12;
                ctx.shadowOffsetY = 5;
                drawPill(ctx, -hw, -hh, b.w, b.h);
                ctx.fillStyle = b.color;
                ctx.fill();

                ctx.shadowColor   = 'transparent';
                ctx.shadowBlur    = 0;
                ctx.shadowOffsetY = 0;
                ctx.strokeStyle   = 'rgba(0,0,0,0.08)';
                ctx.lineWidth     = 1;
                ctx.stroke();

                ctx.fillStyle    = 'rgba(15,23,42,0.88)';
                ctx.font         = `700 ${b.fontSize}px "Plus Jakarta Sans", sans-serif`;
                ctx.textAlign    = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(b.text, 0, 0);
                ctx.restore();
            }

            animRef.current = requestAnimationFrame(animate);
        };
        animRef.current = requestAnimationFrame(animate);

        return (): void => {
            cancelAnimationFrame(animRef.current);
            window.removeEventListener('resize', init);
            if (engineRef.current) Engine.clear(engineRef.current);
        };
    }, [spawnBubble]);

    // ── Dump ──────────────────────────────────────────────────────────────────
    const handleClick = (): void => {
        if (hasDumpedRef.current) return;
        hasDumpedRef.current = true;

        // Remove only the floor; keep side walls
        Composite.remove(engineRef.current!.world, wallsRef.current[0]);

        // Crank gravity
        engineRef.current!.gravity.y = 4.5;

        const H = canvasRef.current!.height;
        bubblesRef.current.forEach(b => {
            b.dumping = true;
            const normY = b.body.position.y / H;
            const kick  = 6 + normY * 14 + Math.random() * 4;
            Body.setVelocity(b.body, {
                x: b.body.velocity.x + (Math.random() - 0.5) * 3,
                y: b.body.velocity.y + kick,
            });
            Body.setAngularVelocity(b.body, b.body.angularVelocity + (Math.random() - 0.5) * 0.3);
        });

        setTimeout(() => setPhase('dumped'), 1000);
    };

    // ── Subtext ───────────────────────────────────────────────────────────────
    const lines: { text: string; delay: number }[] = [
        { text: 'Finally.',                 delay: 0    },
        { text: 'Your brain decluttered.',  delay: 1000 },
        { text: 'Your time to focus.',      delay: 2000 },
    ];

    return (
        <div className="fixed inset-0 overflow-hidden" style={{ background: '#f8fafc' }}>
            <canvas ref={canvasRef} className="absolute inset-0 z-0" />

            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">

                {phase === 'falling' && (
                    <div className="pointer-events-auto text-center select-none">
                        <h1
                            className="font-black leading-none text-slate-900 cursor-pointer transition-transform hover:scale-[1.02] duration-300"
                            style={{
                                fontFamily:    "'Plus Jakarta Sans', sans-serif",
                                fontSize:      'clamp(80px, 15vw, 170px)',
                                letterSpacing: '-0.04em',
                            }}
                            onClick={handleClick}
                        >
                            Dumped
                        </h1>
                        <div style={{ textAlign: 'center', marginTop: '28px' }}>
                            <button
                                onClick={handleClick}
                                style={{
                                    display:       'inline-block',
                                    padding:       '10px 28px',
                                    background:    '#0f172a',
                                    color:         '#fff',
                                    borderRadius:  '100px',
                                    fontSize:      '14px',
                                    fontWeight:    700,
                                    letterSpacing: '0.08em',
                                    textTransform: 'uppercase',
                                    border:        'none',
                                    cursor:        'pointer',
                                    fontFamily:    "'Plus Jakarta Sans', sans-serif",
                                    boxShadow:     '0 4px 20px rgba(0,0,0,0.18)',
                                    transition:    'background 0.2s, transform 0.15s',
                                }}
                            >
                                Tap to empty your brain
                            </button>
                        </div>
                    </div>
                )}

                {phase === 'dumped' && (
                    <div className="pointer-events-auto text-center px-8">
                        <div className="flex flex-col items-center gap-3 mb-16">
                            {lines.map((line, i) => (
                                <p
                                    key={i}
                                    className="font-black text-slate-900 whitespace-nowrap"
                                    style={{
                                        fontFamily:     "'Plus Jakarta Sans', sans-serif",
                                        fontSize:       'clamp(28px, 4.8vw, 60px)',
                                        letterSpacing:  '-0.03em',
                                        lineHeight:     1.1,
                                        opacity:        0,
                                        animation:      'fadeSlideUp 1s ease forwards',
                                        animationDelay: `${line.delay}ms`,
                                    }}
                                >
                                    {line.text}
                                </p>
                            ))}
                        </div>
                        <button
                            onClick={onGetStarted}
                            style={{
                                opacity:        0,
                                animation:      'fadeSlideUp 1s ease forwards',
                                animationDelay: '3200ms',
                                fontFamily:     "'Plus Jakarta Sans', sans-serif",
                            }}
                            className="px-9 py-3.5 bg-slate-900 text-white font-bold text-sm rounded-full hover:bg-slate-700 transition-all hover:scale-105 active:scale-95 shadow-lg"
                        >
                            Get started →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
