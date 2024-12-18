import React, { useState, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { Download } from 'lucide-react';

interface ChartViewerProps {
  data: any[];
  columns: string[];
  onClose: () => void;
}

type ChartType = 'bar' | 'line' | 'pie';

export const ChartViewer: React.FC<ChartViewerProps> = ({ data, columns, onClose }) => {
  const [chartType, setChartType] = useState<ChartType>('bar');
  const chartRef = useRef<ReactECharts>(null);

  const getChartOption = () => {
    const xAxisColumn = columns[0];
    const yAxisColumn = columns[1];

    switch (chartType) {
      case 'bar':
        return {
          title: {
            text: '数据可视化'
          },
          tooltip: {},
          xAxis: {
            data: data.map(item => item[xAxisColumn]),
            name: xAxisColumn
          },
          yAxis: {
            name: yAxisColumn
          },
          series: [{
            name: yAxisColumn,
            type: 'bar',
            data: data.map(item => item[yAxisColumn])
          }]
        };
      case 'line':
        return {
          title: {
            text: '数据可视化'
          },
          tooltip: {},
          xAxis: {
            data: data.map(item => item[xAxisColumn]),
            name: xAxisColumn
          },
          yAxis: {
            name: yAxisColumn
          },
          series: [{
            name: yAxisColumn,
            type: 'line',
            data: data.map(item => item[yAxisColumn])
          }]
        };
      case 'pie':
        return {
          title: {
            text: '数据可视化'
          },
          tooltip: {},
          series: [{
            name: yAxisColumn,
            type: 'pie',
            data: data.map(item => ({
              name: item[xAxisColumn],
              value: item[yAxisColumn]
            }))
          }]
        };
      default:
        return {};
    }
  };

  const handleDownload = () => {
    if (chartRef.current) {
      const chart: echarts.ECharts = chartRef.current.getEchartsInstance();
      const base64 = chart.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: '#fff'
      });

      const link = document.createElement('a');
      link.download = `chart-${new Date().toISOString()}.png`;
      link.href = base64;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-4 rounded-lg w-4/5 h-4/5">
        <div className="flex justify-between mb-4">
          <div className="space-x-2">
            <button
              className={`px-3 py-1 rounded ${chartType === 'bar' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              onClick={() => setChartType('bar')}
            >
              柱状图
            </button>
            <button
              className={`px-3 py-1 rounded ${chartType === 'line' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              onClick={() => setChartType('line')}
            >
              折线图
            </button>
            <button
              className={`px-3 py-1 rounded ${chartType === 'pie' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              onClick={() => setChartType('pie')}
            >
              饼图
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-1 px-3 py-1 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
              onClick={handleDownload}
              title="下载图表"
            >
              <Download className="w-4 h-4" />
              <span>下载</span>
            </button>
            <button
              className="text-gray-500 hover:text-gray-700"
              onClick={onClose}
            >
              关闭
            </button>
          </div>
        </div>
        <ReactECharts
          ref={chartRef}
          option={getChartOption()}
          style={{ height: 'calc(100% - 60px)' }}
        />
      </div>
    </div>
  );
}; 