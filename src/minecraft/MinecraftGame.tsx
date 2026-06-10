import { useEffect, useRef, useState } from "react";
import { Game } from "./game";
import { BLOCK_NAMES, HOTBAR, faceTiles } from "./blocks";
import { tileIconDataURL } from "./textures";

export default function MinecraftGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);

  const [selected, setSelected] = useState(0);
  const [fps, setFps] = useState(0);
  const [locked, setLocked] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0, z: 0 });
  const [touchDevice, setTouchDevice] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    setTouchDevice(!("requestPointerLock" in HTMLElement.prototype) || "ontouchstart" in window);

    const game = new Game(container, {
      onSelect: setSelected,
      onFps: setFps,
      onLockChange: setLocked,
      onPosition: (x, y, z) => setPos({ x, y, z }),
    });
    gameRef.current = game;
    game.start();

    return () => {
      game.dispose();
      gameRef.current = null;
    };
  }, []);

  const icons = HOTBAR.map((b) => tileIconDataURL(faceTiles(b).side));

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        cursor: locked ? "none" : "pointer",
        background: "#87ceeb",
        userSelect: "none",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    >
      {/* Crosshair */}
      {locked && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 22,
            height: 22,
            pointerEvents: "none",
            mixBlendMode: "difference",
          }}
        >
          <div style={{ position: "absolute", top: 10, left: 0, width: 22, height: 2, background: "#fff" }} />
          <div style={{ position: "absolute", left: 10, top: 0, width: 2, height: 22, background: "#fff" }} />
        </div>
      )}

      {/* Top-left HUD */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          color: "#fff",
          textShadow: "0 1px 2px rgba(0,0,0,0.8)",
          fontSize: 13,
          lineHeight: 1.5,
          pointerEvents: "none",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 15 }}>Minecraft · Voxel Clone</div>
        <div>FPS: {fps}</div>
        <div>
          XYZ: {pos.x.toFixed(1)} / {pos.y.toFixed(1)} / {pos.z.toFixed(1)}
        </div>
        <div style={{ opacity: 0.85 }}>Bloque: {BLOCK_NAMES[HOTBAR[selected]] ?? "?"}</div>
      </div>

      {/* Hotbar */}
      <div
        style={{
          position: "absolute",
          bottom: 18,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 4,
          padding: 4,
          background: "rgba(0,0,0,0.35)",
          borderRadius: 6,
          border: "2px solid rgba(0,0,0,0.5)",
        }}
      >
        {icons.map((icon, i) => (
          <div
            key={i}
            onClick={() => gameRef.current?.selectSlot(i)}
            style={{
              width: 48,
              height: 48,
              borderRadius: 4,
              border: i === selected ? "3px solid #fff" : "3px solid rgba(255,255,255,0.25)",
              boxShadow: i === selected ? "0 0 0 1px rgba(0,0,0,0.6)" : "none",
              background: "rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              cursor: "pointer",
              transform: i === selected ? "scale(1.05)" : "scale(1)",
              transition: "transform 0.08s",
            }}
          >
            <img
              src={icon}
              alt=""
              draggable={false}
              style={{ width: 36, height: 36, imageRendering: "pixelated" }}
            />
            <span
              style={{
                position: "absolute",
                top: 1,
                left: 4,
                fontSize: 11,
                color: "#fff",
                textShadow: "0 1px 2px #000",
              }}
            >
              {i + 1}
            </span>
          </div>
        ))}
      </div>

      {/* Start / pause overlay */}
      {!locked && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.55)",
            color: "#fff",
            textAlign: "center",
            padding: 24,
          }}
        >
          <div style={{ maxWidth: 480 }}>
            <h1 style={{ fontSize: 40, margin: "0 0 4px", letterSpacing: 1 }}>MINECRAFT</h1>
            <p style={{ margin: "0 0 20px", opacity: 0.8 }}>Clon de voxels hecho con Three.js</p>

            {touchDevice ? (
              <p style={{ fontSize: 15, lineHeight: 1.6 }}>
                Este clon necesita teclado y ratón. Ábrelo en un ordenador de escritorio
                para jugar con el control de puntero.
              </p>
            ) : (
              <>
                <button
                  onClick={() => containerRef.current?.requestPointerLock()}
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    padding: "12px 28px",
                    border: "none",
                    borderRadius: 6,
                    background: "#5fa83a",
                    color: "#fff",
                    cursor: "pointer",
                    boxShadow: "0 4px 0 #3f7826",
                  }}
                >
                  ▶ Jugar
                </button>
                <div
                  style={{
                    marginTop: 22,
                    fontSize: 13,
                    lineHeight: 1.9,
                    textAlign: "left",
                    display: "inline-block",
                    opacity: 0.9,
                  }}
                >
                  <div>
                    <b>WASD</b> — moverse &nbsp;·&nbsp; <b>Ratón</b> — mirar
                  </div>
                  <div>
                    <b>Espacio</b> — saltar &nbsp;·&nbsp; <b>Ctrl</b> — correr
                  </div>
                  <div>
                    <b>Clic izq.</b> — romper &nbsp;·&nbsp; <b>Clic der.</b> — colocar
                  </div>
                  <div>
                    <b>1-9 / rueda</b> — elegir bloque &nbsp;·&nbsp; <b>F</b> — volar
                  </div>
                  <div>
                    En vuelo: <b>Espacio</b> subir &nbsp;·&nbsp; <b>Shift</b> bajar
                  </div>
                  <div style={{ marginTop: 6, opacity: 0.7 }}>Pulsa Esc para liberar el ratón.</div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
