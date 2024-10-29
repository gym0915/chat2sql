import React, { useEffect, useRef, useState } from 'react';
import { TableStructure, TableRelation } from '../../types/database';

interface SchemaVisualizerProps {
  tables: TableStructure[];
  relations: TableRelation[];
}

const SchemaVisualizer: React.FC<SchemaVisualizerProps> = ({ tables, relations }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6); // 这里修改初始缩放比例
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [draggingTable, setDraggingTable] = useState<string | null>(null);
  const [tablePositions, setTablePositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectionBox, setSelectionBox] = useState<{
    start: { x: number; y: number };
    current: { x: number; y: number };
    isSelecting: boolean;
  } | null>(null);
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const lastPosition = useRef({ x: position.x, y: position.y });

  // 初始化表格位置
  useEffect(() => {
    const newPositions = new Map();
    const containerWidth = containerRef.current?.clientWidth || 1000;
    
    // 修改表格尺寸和间距
    const TABLE_WIDTH = 250;  
    const TABLE_HEIGHT = 100;
    const SPACING =50;       // 减小垂直间距，从100改为50
    const LEVEL_INDENT = 500; // 增加水平间距，从300改为400，让关系线文字有更多空间

    // 创建表格关系图
    const tableConnections = new Map<string, Set<string>>();
    const connectionCounts = new Map<string, number>();
    
    // 初始化连接信息
    tables.forEach(table => {
      tableConnections.set(table.name, new Set());
      connectionCounts.set(table.name, 0);
    });

    // 统计关系和连接数
    relations.forEach(relation => {
      const sourceSet = tableConnections.get(relation.source);
      const targetSet = tableConnections.get(relation.target);
      if (sourceSet) {
        sourceSet.add(relation.target);
        connectionCounts.set(relation.source, (connectionCounts.get(relation.source) || 0) + 1);
      }
      if (targetSet) {
        targetSet.add(relation.source);
        connectionCounts.set(relation.target, (connectionCounts.get(relation.target) || 0) + 1);
      }
    });

    // 按连接数排序表格
    const sortedTables = [...tables].sort((a, b) => {
      const countA = connectionCounts.get(a.name) || 0;
      const countB = connectionCounts.get(b.name) || 0;
      return countB - countA;
    });

    // 分离有关系和无关系的表格
    const connectedTables = sortedTables.filter(table => 
      (connectionCounts.get(table.name) || 0) > 0
    );
    const unconnectedTables = sortedTables.filter(table => 
      (connectionCounts.get(table.name) || 0) === 0
    );

    // 用于记录已处理的表
    const processedTables = new Set<string>();
    
    // 处理每个关联表组
    let currentY = SPACING;

    // 递归函数：布局一个表及其关联表
    const layoutTableGroup = (
      tableName: string, 
      level: number, 
      startY: number,
      processed: Set<string>
    ): number => {
      if (processed.has(tableName)) return startY;
      
      processed.add(tableName);
      
      // 设置当前表的位置
      newPositions.set(tableName, {
        x: level * LEVEL_INDENT + SPACING,
        y: startY
      });

      // 获取关联表
      const relatedTables = tableConnections.get(tableName) || new Set();
      let maxY = startY;
      
      // 布局关联表，减小垂直间距
      let childY = startY;
      relatedTables.forEach(relatedTable => {
        if (!processed.has(relatedTable)) {
          childY = layoutTableGroup(
            relatedTable,
            level + 1,
            childY,
            processed
          );
          maxY = Math.max(maxY, childY);
          // 减小表格之间的垂直间距
          childY += TABLE_HEIGHT + SPACING * 0.6; // 将间距乘以0.6，使表格更紧凑
        }
      });

      return Math.max(maxY, startY + TABLE_HEIGHT);
    };

    // 处理有关系的表格
    connectedTables.forEach(table => {
      if (!processedTables.has(table.name)) {
        currentY = layoutTableGroup(
          table.name,
          0,
          currentY,
          processedTables
        ) + SPACING;
      }
    });

    // 处理无关系的表格时也使用相同的间距
    let unconnectedX = SPACING;
    let unconnectedY = currentY + SPACING * 2;
    
    unconnectedTables.forEach(table => {
      if (unconnectedX + TABLE_WIDTH > containerWidth - SPACING) {
        unconnectedX = SPACING;
        unconnectedY += TABLE_HEIGHT + SPACING * 0.6; // 保持一致的垂直间距
      }
      
      newPositions.set(table.name, {
        x: unconnectedX,
        y: unconnectedY
      });
      
      unconnectedX += TABLE_WIDTH + SPACING;
    });

    setTablePositions(newPositions);
  }, [tables, relations]);

  // 修改处理缩放的实现
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setScale(prev => Math.min(Math.max(0.1, prev * delta), 2));
    };

    // 添加事件监听器，并设置 passive: false
    container.addEventListener('wheel', handleWheel, { passive: false });

    // 清理函数
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // 处理画布拖动
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    
    // 如果点击时没有按住 Shift，清除已选择的表格
    if (!e.shiftKey) {
      setSelectedTables(new Set());
    }

    // 开始框选
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    const startX = (e.clientX - containerRect.left - position.x) / scale;
    const startY = (e.clientY - containerRect.top - position.y) / scale;

    setSelectionBox({
      start: { x: startX, y: startY },
      current: { x: startX, y: startY },
      isSelecting: true
    });
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    if (selectionBox?.isSelecting) {
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      const currentX = (e.clientX - containerRect.left - position.x) / scale;
      const currentY = (e.clientY - containerRect.top - position.y) / scale;

      setSelectionBox(prev => ({
        ...prev!,
        current: { x: currentX, y: currentY }
      }));

      // 检查哪些表格在选择框内
      const selectionRect = {
        left: Math.min(selectionBox.start.x, currentX),
        right: Math.max(selectionBox.start.x, currentX),
        top: Math.min(selectionBox.start.y, currentY),
        bottom: Math.max(selectionBox.start.y, currentY)
      };

      const newSelectedTables = new Set(e.shiftKey ? Array.from(selectedTables) : []);
      tablePositions.forEach((pos, tableName) => {
        const tableRect = {
          left: pos.x,
          right: pos.x + 200, // 表格宽度
          top: pos.y,
          bottom: pos.y + 100 // 表格高度
        };

        if (
          tableRect.left < selectionRect.right &&
          tableRect.right > selectionRect.left &&
          tableRect.top < selectionRect.bottom &&
          tableRect.bottom > selectionRect.top
        ) {
          newSelectedTables.add(tableName);
        }
      });

      setSelectedTables(newSelectedTables);
    } else if (draggingTable) {
      handleTableMouseMove(e);
    } else {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggingTable(null);
    setSelectionBox(null);
  };

  // 修改表格拖拽相关的处理函数
  const handleTableMouseDown = (e: React.MouseEvent, tableName: string) => {
    e.stopPropagation(); // 阻止事件冒泡，避免触发画布拖拽
    setDraggingTable(tableName);
    
    // 获取表格当前位置
    const currentPos = tablePositions.get(tableName);
    if (!currentPos) return;

    // 计算鼠标相对于表格的偏移量
    const mouseX = (e.clientX - position.x) / scale;
    const mouseY = (e.clientY - position.y) / scale;
    
    setDragOffset({
      x: mouseX - currentPos.x,
      y: mouseY - currentPos.y
    });
  };

  const handleTableMouseMove = (e: React.MouseEvent) => {
    if (!draggingTable) return;

    // 计算新位置，考虑缩放和画布位置
    const mouseX = (e.clientX - position.x) / scale;
    const mouseY = (e.clientY - position.y) / scale;
    
    // 使用保存的偏移量计算位置
    const newX = mouseX - dragOffset.x;
    const newY = mouseY - dragOffset.y;

    // 更新表格位置
    setTablePositions(prev => {
      const newPositions = new Map(prev);
      newPositions.set(draggingTable, { x: newX, y: newY });
      return newPositions;
    });
  };

  const handleTableMouseUp = () => {
    setDraggingTable(null);
  };

  // 修改 renderTable 函数
  const renderTable = (table: TableStructure) => {
    const pos = tablePositions.get(table.name);
    if (!pos) return null;

    return (
      <div
        key={table.name}
        className={`absolute border border-gray-600 rounded-md shadow-sm cursor-move 
          ${draggingTable === table.name ? 'shadow-lg' : ''}`}
        style={{
          left: pos.x,
          top: pos.y,
          width: 250,
          zIndex: draggingTable === table.name ? 1000 : 1,
          userSelect: 'none'
        }}
        onMouseDown={(e) => handleTableMouseDown(e, table.name)}
      >
        {/* 表头 - 修改背景色和文字颜色 */}
        <div className="bg-gray-700 px-4 py-2 rounded-t-md">
          <h3 className="font-medium text-white text-base">{table.name}</h3>
        </div>
        
        {/* 字段列表 - 修改背景色 */}
        <div className="p-2 bg-gray-100">
          {table.fields.map((field, i) => (
            <div 
              key={i} 
              className="flex items-center gap-2 px-2 py-1 hover:bg-gray-200 rounded"
            >
              {field.isPrimary && (
                <span className="text-yellow-500">🔑</span>
              )}
              <span className={`flex-grow font-medium text-gray-700 ${
                field.isPrimary ? 'text-yellow-600' : ''
              }`}>
                {field.name}
              </span>
              <span className="text-gray-500 text-sm">{field.type}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 修改 renderRelations 函数中的关系线样式
  const renderRelations = () => {
    return relations.map((relation, index) => {
      const sourcePos = tablePositions.get(relation.source);
      const targetPos = tablePositions.get(relation.target);
      
      if (!sourcePos || !targetPos) return null;

      // 计算表格的中心点
      const sourceCenter = {
        x: sourcePos.x + 100,
        y: sourcePos.y + 50
      };

      const targetCenter = {
        x: targetPos.x + 100,
        y: targetPos.y + 50
      };

      // 计算折线的中点
      const midX = (sourceCenter.x + targetCenter.x) / 2;

      // 创建折线路径
      const path = `
        M ${sourceCenter.x} ${sourceCenter.y}
        L ${midX} ${sourceCenter.y}
        L ${midX} ${targetCenter.y}
        L ${targetCenter.x} ${targetCenter.y}
      `;

      return (
        <g key={index}>
          {/* 折线 - 统一使用虚线 */}
          <path
            d={path}
            fill="none"
            stroke="#666"
            strokeWidth="1"
            strokeDasharray="5,5"
            strokeLinejoin="round"
          />
          
          {/* 箭头 */}
          <path
            d={`M ${targetCenter.x} ${targetCenter.y} 
               L ${targetCenter.x - 10} ${targetCenter.y - 5}
               M ${targetCenter.x} ${targetCenter.y}
               L ${targetCenter.x - 10} ${targetCenter.y + 5}`}
            stroke="#666"
            strokeWidth="1"
            fill="none"
          />
          
          {/* 关系文本标签 */}
          <text
            x={midX}
            y={(sourceCenter.y + targetCenter.y) / 2}
            dy="-5"
            textAnchor="middle"
            fill="#666"
            fontSize="12"
            className="select-none"
          >
            {relation.sourceField} → {relation.targetField}
          </text>
        </g>
      );
    });
  };

  // 处理整个画布的拖拽
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // 只有当点击背景时才启动画布拖拽
    if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'svg') {
      setIsDraggingCanvas(true);
      setDragStartPos({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
      lastPosition.current = position;
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isDraggingCanvas) {
      const newX = e.clientX - dragStartPos.x;
      const newY = e.clientY - dragStartPos.y;
      setPosition({ x: newX, y: newY });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDraggingCanvas(false);
  };

  // 在 return 语句前添加缩放按钮的处理函数
  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.1, 1));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.1, 0.1));
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-gray-50"
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={(e) => {
        if (isDraggingCanvas) {
          handleCanvasMouseMove(e);
        }
        if (draggingTable) {
          handleTableMouseMove(e);
        }
      }}
      onMouseUp={() => {
        handleCanvasMouseUp();
        handleTableMouseUp();
      }}
      onMouseLeave={() => {
        handleCanvasMouseUp();
        handleTableMouseUp();
      }}
    >
      {/* SVG 容器 */}
      <svg className="absolute inset-0 w-full h-full">
        <g
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: '0 0'
          }}
        >
          {renderRelations()}
        </g>
      </svg>

      {/* 表格容器 */}
      <div
        className="absolute"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transformOrigin: '0 0'
        }}
      >
        {tables.map(renderTable)}
      </div>

      {/* 缩放控制按钮 */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <button
          onClick={handleZoomIn}
          className="w-8 h-8 bg-white rounded-md shadow-md hover:bg-gray-50 active:bg-gray-100 
            flex items-center justify-center border border-gray-200 text-gray-600"
          title="放大"
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          className="w-8 h-8 bg-white rounded-md shadow-md hover:bg-gray-50 active:bg-gray-100 
            flex items-center justify-center border border-gray-200 text-gray-600"
          title="缩小"
        >
          -
        </button>
      </div>
    </div>
  );
};

export default SchemaVisualizer;
