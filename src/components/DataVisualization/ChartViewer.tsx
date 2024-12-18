import React, { useState } from 'react';
import ReactECharts from 'echarts-for-react';

interface ChartViewerProps {
  data: any[];
  columns: string[];
  onClose: () => void;
}

type ChartType = 'bar' | 'line' | 'pie';

export const ChartViewer: React.FC<ChartViewerProps> = ({ data, columns, onClose }) => {
  const [chartType, setChartType] = useState<ChartType>('bar');

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
          <button
            className="text-gray-500 hover:text-gray-700"
            onClick={onClose}
          >
            关闭
          </button>
        </div>
        <ReactECharts
          option={getChartOption()}
          style={{ height: 'calc(100% - 60px)' }}
        />
      </div>
    </div>
  );
}; 