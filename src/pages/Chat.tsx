const Chat: React.FC = () => {
  const [modelOptions, setModelOptions] = useState<ModelOption[]>([
    {
      source: ModelSource.OLLAMA,
      models: [] // 将从 Ollama API 获取
    }
  ]);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const ollamaModels = await fetchOllamaModels();
        logger.info('Fetched Ollama models:', ollamaModels);
        
        setModelOptions(prev => prev.map(option => 
          option.source === ModelSource.OLLAMA 
            ? { ...option, models: ollamaModels }
            : option
        ));
      } catch (error) {
        logger.error('Error fetching models:', error);
      }
    };

    fetchModels();
  }, []);

  return (
    <ChatInterface 
      modelOptions={modelOptions}
      selectedDatabase={selectedDatabase}
    />
  );
}; 