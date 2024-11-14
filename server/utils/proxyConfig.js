/**
 * 获取 Axios 代理配置
 * @returns {Object} Axios 代理配置对象
 */
export function getAxiosProxyConfig() {
  // 从环境变量获取代理配置
  const proxyEnabled = process.env.PROXY_ENABLED === 'true';
  
  if (!proxyEnabled) {
    console.log('代理未启用');
    return {};
  }

  const proxyConfig = {
    proxy: {
      host: process.env.PROXY_HOST || '127.0.0.1',
      port: parseInt(process.env.PROXY_PORT || '7890'),
      protocol: process.env.PROXY_PROTOCOL || 'http'
    }
  };

  console.log('使用代理配置:', proxyConfig);
  return proxyConfig;
}

export default {
  getAxiosProxyConfig
}; 