// 📁 src/components/ChartPreview.tsx
import React, { useEffect, useRef } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  IChartApi,
  CandlestickData,
  LineData,
} from 'lightweight-charts';

interface ChartPreviewProps {
  symbol: string;
  data: CandlestickData[];
  overlayLine?: { label: string; values: LineData[] };
}

const ChartPreview = ({ symbol, data, overlayLine }: ChartPreviewProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return;

    const chart: IChartApi = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#121212' },
        textColor: '#FFFFFF',
      },
      grid: {
        vertLines: { color: '#2A2A2A' },
        horzLines: { color: '#2A2A2A' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 300,
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      timeScale: {
        timeVisible: true,
        borderColor: '#485c7b',
      },
    });

    const candleSeries = chart.addCandlestickSeries();
    candleSeries.setData(data);

    if (overlayLine) {
      const lineSeries = chart.addLineSeries();
      lineSeries.applyOptions({
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        color: '#FF3B30',
      });
      lineSeries.setData(overlayLine.values);
    }

    const resizeObserver = new ResizeObserver(() => {
      chart.applyOptions({
        width: chartContainerRef.current!.clientWidth,
      });
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      chart.remove();
      resizeObserver.disconnect();
    };
  }, [data, overlayLine]);

  return (
    <div className="animate-fadeIn bg-[#1E1E1E] rounded-2xl p-4 shadow mb-4">
      <h3 className="text-white text-sm mb-2">{symbol} – Preview</h3>
      <div
        ref={chartContainerRef}
        className="w-full h-[300px] rounded overflow-hidden"
      />
    </div>
  );
};

export default ChartPreview;
