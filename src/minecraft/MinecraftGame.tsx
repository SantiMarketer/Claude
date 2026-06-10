import { useEffect, useMemo, useRef, useState } from "react";
import { Game } from "./game";
import { DEFAULT_HOTBAR, Item, PALETTE, itemName } from "./items";
import { itemIconDataURL } from "./itemTextures";

const MAX_HEALTH = 20;
const HEARTS = "\u2665".repeat(10);

export default function MinecraftGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);

  const [selected, setSelected] = useState(0);
  const [hotbar, setHotbar] = useState<Item[]>(DEFAULT_HOTBAR);
  const [fps, setFps] = useState(0);
  const [locked, setLocked] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0, z: 0 });
  const [touchDevice, setTouchDevice] = useState(false);
  const [health, setHealth] = useState(MAX_HEALTH);
  const [dead, setDead] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [sprinting, setSprinting] = useState(false);
  const [mineProgress, setMineProgress] = useState(0);
  const [hurtAt, setHurtAt] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    setTouchDevice(!("requestPointerLock" in HTMLElement.prototype) || "ontouchstart" in window);

    const game = new Game(container, {
      onSelect: setSelected,
      onHotbar: setHotbar,
      onFps: setFps,
      onLockChange: setLocked,
      onPosition: (x, y, z) => setPos({ x, y, z }),
      onHealth: (hp) => setHealth(hp),
      onHurt: () => setHurtAt(Date.now()),
      onDeath: () => setDead(true),
      onInventory: setInventoryOpen,
      onSprint: setSprinting,
      onMineProgress: setMineProgress,
    });
    gameRef.current = game;
    game.start();

    return () => {
      game.dispose();
      gameRef.current = null;
    };
  }, []);

  const hotbarIcons = useMemo(() => hotbar.map((it) => itemIconDataURL(it)), [hotbar]);
  const paletteIcons = useMemo(() => PALETTE.map((it) => itemIconDataURL(it)), []);
  const healthPct = (health / MAX_HEALTH) * 100;
  const showCrosshair = locked && !inventoryOpen && !dead;

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        cursor: showCrosshair ? "none" : "default",
        background: "#87ceeb",
        userSelect: "none",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    >
      <style>{`
        @keyframes hurtFade { from { opacity: 0.6; } to { opacity: 0; } }
      `}</style>

      {/* Damage flash */}
      {hurtAt > 0 && (
        <div
          key={hurtAt}
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: "radial-gradient(ellipse at center, rgba(170,0,0,0) 40%, rgba(170,0,0,0.85) 100%)",
            animation: "hurtFade 0.6s ease-out forwards",
          }}
        />
      )}

      {/* Crosshair */}
      {showCrosshair && (
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

      {/* Mining progress bar */}
      {showCrosshair && mineProgress > 0 && mineProgress < 1 && (
        <div
          style={{
            position: "absolute",
            top: "calc(50% + 24px)",
            left: "50%",
            transform: "translateX(-50%)",
            width: 80,
            height: 7,
            background: "rgba(0,0,0,0.5)",
            border: "1px solid rgba(255,255,255,0.6)",
            borderRadius: 3,
            pointerEvents: "none",
          }}
        >
          <div style={{ width: `${mineProgress * 100}%`, height: "100%", background: "#cfcfcf" }} />
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
        <div style={{ opacity: 0.85 }}>En mano: {itemName(hotbar[selected] ?? DEFAULT_HOTBAR[0])}</div>
        {sprinting && <div style={{ color: "#9fe89f" }}>Corriendo »</div>}
      </div>

      {/* Hearts (health) */}
      {!dead && (
        <div
          style={{
            position: "absolute",
            bottom: 78,
            left: "50%",
            transform: "translateX(-50%)",
            pointerEvents: "none",
            fontSize: 22,
            letterSpacing: 2,
            lineHeight: 1,
          }}
        >
          <div style={{ position: "relative", display: "inline-block" }}>
            <div style={{ color: "#2a0a0a", textShadow: "0 1px 1px #000" }}>{HEARTS}</div>
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                overflow: "hidden",
                whiteSpace: "nowrap",
                width: `${healthPct}%`,
                color: "#ff3b3b",
                textShadow: "0 1px 1px #000",
              }}
            >
              {HEARTS}
            </div>
          </div>
        </div>
      )}

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
        {hotbarIcons.map((icon, i) => (
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
            <img src={icon} alt="" draggable={false} style={{ width: 36, height: 36, imageRendering: "pixelated" }} />
            <span
              style={{ position: "absolute", top: 1, left: 4, fontSize: 11, color: "#fff", textShadow: "0 1px 2px #000" }}
            >
              {i + 1}
            </span>
          </div>
        ))}
      </div>

      {/* Inventory overlay */}
      {inventoryOpen && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.6)",
            color: "#fff",
          }}
        >
          <div
            style={{
              background: "#c6c6c6",
              border: "4px solid #373737",
              borderRadius: 6,
              padding: 18,
              width: 460,
              maxWidth: "92vw",
              color: "#1d1d1d",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <b style={{ fontSize: 18 }}>Inventario</b>
              <button
                onClick={() => gameRef.current?.closeInventory()}
                style={{ border: "none", background: "#7a7a7a", color: "#fff", padding: "4px 12px", borderRadius: 4, cursor: "pointer" }}
              >
                Cerrar (E)
              </button>
            </div>
            <div style={{ fontSize: 12, marginBottom: 10, opacity: 0.8 }}>
              Haz clic en un objeto para ponerlo en la ranura {selected + 1} de tu barra.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6 }}>
              {PALETTE.map((item, i) => (
                <div
                  key={i}
                  title={itemName(item)}
                  onClick={() => gameRef.current?.assignToSelected(item)}
                  style={{
                    height: 56,
                    background: "#8b8b8b",
                    border: "2px solid #5a5a5a",
                    borderRadius: 4,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <img src={paletteIcons[i]} alt="" draggable={false} style={{ width: 30, height: 30, imageRendering: "pixelated" }} />
                  <span style={{ fontSize: 9, marginTop: 2 }}>{itemName(item)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Death overlay */}
      {dead && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(80,0,0,0.55)",
            color: "#fff",
            textAlign: "center",
          }}
        >
          <div>
            <h1 style={{ fontSize: 44, margin: "0 0 16px", textShadow: "0 2px 6px #000" }}>Has muerto</h1>
            <button
              onClick={() => {
                setDead(false);
                gameRef.current?.respawn();
              }}
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
              Reaparecer
            </button>
          </div>
        </div>
      )}

      {/* Start / pause overlay */}
      {!locked && !inventoryOpen && !dead && (
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
            <p style={{ margin: "0 0 20px", opacity: 0.8 }}>Supervivencia voxel hecha con Three.js</p>

            {touchDevice ? (
              <p style={{ fontSize: 15, lineHeight: 1.6 }}>
                Este clon necesita teclado y ratón. Ábrelo en un ordenador de escritorio para jugar.
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
                <div style={{ marginTop: 22, fontSize: 13, lineHeight: 1.9, textAlign: "left", display: "inline-block", opacity: 0.9 }}>
                  <div><b>WASD</b> — moverse &nbsp;·&nbsp; <b>Ratón</b> — mirar</div>
                  <div><b>Doble W</b> o <b>Ctrl</b> — correr &nbsp;·&nbsp; <b>Espacio</b> — saltar</div>
                  <div><b>Clic izq.</b> — romper / atacar &nbsp;·&nbsp; <b>Clic der.</b> — colocar</div>
                  <div><b>1-9 / rueda</b> — elegir &nbsp;·&nbsp; <b>E</b> — inventario &nbsp;·&nbsp; <b>F</b> — volar</div>
                  <div style={{ marginTop: 6, opacity: 0.7 }}>¡Cuidado con los zombis de noche... y con las caídas!</div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
