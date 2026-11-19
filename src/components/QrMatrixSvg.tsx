import React, { useMemo } from 'react';
import QRCode from 'qrcode';

interface QrMatrixSvgProps {
  value: string;
  size?: number;
}

export function buildQrModules(value: string): { size: number; rows: boolean[][] } {
  const safeValue = value && value.length > 0 ? value : 'VAAK-EMPTY';
  const qr = QRCode.create(safeValue, { errorCorrectionLevel: 'M' });
  const moduleCount = qr.modules.size;
  const rows: boolean[][] = [];
  for (let r = 0; r < moduleCount; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < moduleCount; c++) {
      row.push(Boolean(qr.modules.get(r, c)));
    }
    rows.push(row);
  }
  return { size: moduleCount, rows };
}

export const QrMatrixSvg: React.FC<QrMatrixSvgProps> = ({ value, size = 160 }) => {
  const { size: gridSize, rows } = useMemo(() => buildQrModules(value), [value]);
  const quietZone = 2;
  const viewSize = gridSize + quietZone * 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${viewSize} ${viewSize}`}
      shapeRendering="crispEdges"
      className="rounded-xl bg-white shadow-sm"
      role="img"
      aria-label={`Scannable QR Code for ${value}`}
    >
      <rect x={0} y={0} width={viewSize} height={viewSize} fill="#FFFFFF" />
      {rows.map((row, r) =>
        row.map((dark, c) =>
          dark ? (
            <rect
              key={`${r}-${c}`}
              x={c + quietZone}
              y={r + quietZone}
              width={1}
              height={1}
              fill="#121418"
            />
          ) : null
        )
      )}
    </svg>
  );
};
