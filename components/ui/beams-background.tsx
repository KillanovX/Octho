"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface AnimatedGradientBackgroundProps {
    className?: string;
    children?: React.ReactNode;
    intensity?: "subtle" | "medium" | "strong";
}

interface Beam {
    x: number;
    y: number;
    width: number;
    length: number;
    angle: number;
    speed: number;
    opacity: number;
    hue: number;
    pulse: number;
    pulseSpeed: number;
}

function createBeam(width: number, height: number): Beam {
    const angle = -35 + Math.random() * 10;
    return {
        x: Math.random() * width * 1.4 - width * 0.2,
        y: Math.random() * height * 1.4 - height * 0.2,
        width: 40 + Math.random() * 80,
        length: height * 2.5,
        angle: angle,
        speed: 0.6 + Math.random() * 1.2,
        opacity: 0.25 + Math.random() * 0.25,
        hue: 190 + Math.random() * 70,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.02 + Math.random() * 0.03,
    };
}

export function BeamsBackground({
    className,
    children,
    intensity = "strong",
}: AnimatedGradientBackgroundProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const beamsRef = useRef<Beam[]>([]);
    const animationFrameRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(0);
    const MINIMUM_BEAMS = 15;

    const opacityMap = {
        subtle: 0.7,
        medium: 0.85,
        strong: 1,
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d", { alpha: true });
        if (!ctx) return;

        const updateCanvasSize = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;
            ctx.scale(dpr, dpr);

            const totalBeams = MINIMUM_BEAMS * 1.2;
            beamsRef.current = Array.from({ length: totalBeams }, () =>
                createBeam(w, h)
            );
        };

        updateCanvasSize();
        window.addEventListener("resize", updateCanvasSize);

        function resetBeam(beam: Beam, index: number, totalBeams: number) {
            const w = window.innerWidth;
            const h = window.innerHeight;
            const column = index % 3;
            const spacing = w / 3;

            beam.y = h + 100;
            beam.x =
                column * spacing +
                spacing / 2 +
                (Math.random() - 0.5) * spacing * 0.5;
            beam.width = 80 + Math.random() * 100;
            beam.speed = 0.5 + Math.random() * 0.5;
            beam.hue = 190 + (index * 70) / totalBeams;
            beam.opacity = 0.3 + Math.random() * 0.2;
            return beam;
        }

        function drawBeam(ctx: CanvasRenderingContext2D, beam: Beam) {
            ctx.save();
            ctx.translate(beam.x, beam.y);
            ctx.rotate((beam.angle * Math.PI) / 180);

            const pulsingOpacity =
                beam.opacity *
                (0.8 + Math.sin(beam.pulse) * 0.2) *
                opacityMap[intensity];

            const gradient = ctx.createLinearGradient(0, 0, 0, beam.length);

            gradient.addColorStop(0, `hsla(${beam.hue}, 85%, 65%, 0)`);
            gradient.addColorStop(
                0.1,
                `hsla(${beam.hue}, 85%, 65%, ${pulsingOpacity * 0.5})`
            );
            gradient.addColorStop(
                0.4,
                `hsla(${beam.hue}, 85%, 65%, ${pulsingOpacity})`
            );
            gradient.addColorStop(
                0.6,
                `hsla(${beam.hue}, 85%, 65%, ${pulsingOpacity})`
            );
            gradient.addColorStop(
                0.9,
                `hsla(${beam.hue}, 85%, 65%, ${pulsingOpacity * 0.5})`
            );
            gradient.addColorStop(1, `hsla(${beam.hue}, 85%, 65%, 0)`);

            ctx.fillStyle = gradient;
            ctx.fillRect(-beam.width / 2, 0, beam.width, beam.length);
            ctx.restore();
        }

        function animate(timestamp: number) {
            if (!canvas || !ctx) return;

            // Throttle rendering to ~30 FPS to ensure main thread availability for user inputs (INP < 50ms)
            const elapsed = timestamp - lastTimeRef.current;
            if (elapsed > 32) {
                lastTimeRef.current = timestamp;
                const w = window.innerWidth;
                const h = window.innerHeight;
                ctx.clearRect(0, 0, w, h);

                const totalBeams = beamsRef.current.length;
                beamsRef.current.forEach((beam, index) => {
                    beam.y -= beam.speed;
                    beam.pulse += beam.pulseSpeed;

                    if (beam.y + beam.length < -100) {
                        resetBeam(beam, index, totalBeams);
                    }

                    drawBeam(ctx, beam);
                });
            }

            animationFrameRef.current = requestAnimationFrame(animate);
        }

        animationFrameRef.current = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener("resize", updateCanvasSize);
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [intensity]);

    return (
        <div
            className={cn(
                "relative min-h-screen w-full overflow-hidden bg-neutral-950",
                className
            )}
            style={{ contain: "paint layout" }}
        >
            {/* Ambient background glow gradient */}
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-950/40 via-neutral-950 to-cyan-950/40 pointer-events-none" />

            {/* Glowing animated Canvas with CSS GPU blur */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 pointer-events-none transform-gpu will-change-transform opacity-85"
                style={{ filter: "blur(16px)" }}
            />

            {/* Content Container */}
            <div className="relative z-10 flex min-h-screen w-full items-center justify-center p-4">
                {children}
            </div>
        </div>
    );
}
