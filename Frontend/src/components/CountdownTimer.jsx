import React, { useEffect } from 'react';
import { useTime } from './TimeContext';

const PRIMARY = "#006199";

export default function CountdownTimer({ onTimerZero }) {
  const { contest, timeleft, loading } = useTime();

  const isContestActive =
    contest && (contest.status === 'running' || contest.status === 'paused');
  const ready = Boolean(isContestActive);

  useEffect(() => {
    if (ready && onTimerZero) {
      onTimerZero();
    }
  }, [ready, onTimerZero]);

  const totalSeconds = Math.max(0, isContestActive ? timeleft : 0);
  const hours   = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const blocks = [
    { value: hours,   label: 'Hours'   },
    { value: minutes, label: 'Minutes' },
    { value: seconds, label: 'Seconds' },
  ];

  if (loading && !contest) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginBottom: "48px",
          fontFamily: "Space Grotesk, sans-serif",
        }}
      >
        <h2
          style={{
            fontSize: "11px",
            fontWeight: "700",
            color: "#94a3b8",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: "24px",
          }}
        >
          Connecting to server...
        </h2>
        <div style={{ display: "flex", gap: "20px" }}>
          {['Hours', 'Minutes', 'Seconds'].map(label => (
            <div
              key={label}
              style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
            >
              <div
                style={{
                  background: "#fff",
                  borderRadius: "12px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
                  border: "1px solid #e2e8f0",
                  borderBottom: `4px solid ${PRIMARY}`,
                  width: "96px",
                  height: "88px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "10px",
                  opacity: 0.4,
                }}
              >
                <span
                  style={{
                    fontSize: "44px",
                    fontWeight: "800",
                    color: PRIMARY,
                    letterSpacing: "-0.03em",
                  }}
                >
                  --
                </span>
              </div>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: "700",
                  color: "#94a3b8",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginBottom: "48px",
        fontFamily: "Space Grotesk, sans-serif",
      }}
    >
      <h2
        style={{
          fontSize: "11px",
          fontWeight: "700",
          color: "#94a3b8",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          marginBottom: "24px",
        }}
      >
        THE CONTEST BEGINS IN
      </h2>
      <div style={{ display: "flex", gap: "20px" }}>
        {blocks.map(({ value, label }) => (
          <div
            key={label}
            style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
          >
            <div
              style={{
                background: "#fff",
                borderRadius: "12px",
                boxShadow: "0 2px 12px rgba(0,97,153,0.10)",
                border: "1px solid #e2e8f0",
                borderBottom: `4px solid ${PRIMARY}`,
                width: "96px",
                height: "88px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "10px",
              }}
            >
              <span
                style={{
                  fontSize: "44px",
                  fontWeight: "800",
                  color: PRIMARY,
                  letterSpacing: "-0.03em",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {String(value).padStart(2, '0')}
              </span>
            </div>
            <span
              style={{
                fontSize: "10px",
                fontWeight: "700",
                color: "#94a3b8",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
