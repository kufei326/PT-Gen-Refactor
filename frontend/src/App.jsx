import { useState } from 'react';
import './App.css';

function App() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState('');
  const [formattedResult, setFormattedResult] = useState(null);
  const [searchResults, setSearchResults] = useState(null);
  const [lastSearchSource, setLastSearchSource] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCopyNotification, setShowCopyNotification] = useState(false);
  const [searchSource, setSearchSource] = useState('auto'); // 新增：搜索源选择

  // 搜索源选项配置
  const searchSourceOptions = [
    { value: 'auto', label: '🤖 智能选择', description: '中文优先TMDB，英文优先IMDb，支持智能回退' },
    { value: 'douban', label: '🎬 豆瓣', description: '豆瓣电影/电视剧 (推荐中文搜索)' },
    { value: 'tmdb', label: '🎭 TMDB', description: 'The Movie Database (需要API密钥)' },
    { value: 'imdb', label: '🎪 IMDb', description: 'Internet Movie Database (推荐英文搜索)' }
  ];

  // 检测文本是否主要为中文
  const isChineseText = (text) => {
    // 统计中文字符数量
    const chineseChars = text.match(/[\u4e00-\u9fa5]/g) || [];
    // 统计英文字符数量
    const englishChars = text.match(/[a-zA-Z]/g) || [];
    
    // 如果中文字符数量大于英文字符数量，则认为是中文文本
    return chineseChars.length > englishChars.length;
  };

  // 抽取API调用逻辑为独立函数
  const fetchApiData = async (apiUrl) => {
    try {
      // 将URL参数转换为POST请求体
      const url = new URL(apiUrl, window.location.origin);
      const params = {};
      for (const [key, value] of url.searchParams) {
        params[key] = value;
      }
      
      const response = await fetch('/api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Request': 'true'
        },
        body: JSON.stringify(params)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('响应数据格式错误：服务器返回的不是JSON格式数据');
      }
      
      const data = await response.json();
      return data;
    } catch (err) {
      if (err instanceof SyntaxError) {
        throw new Error('响应数据格式错误：无法解析JSON数据');
      }
      throw err;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    setError(null);
    setResult('');
    setSearchResults(null); // 清除之前的搜索结果
    setFormattedResult(null);
    setLastSearchSource(null);
    
    try {
      let apiUrl;
      
      // 判断是否为URL（以http开头）还是搜索关键词
      if (url.startsWith('http')) {
        // 直接URL处理
        apiUrl = `/api?url=${encodeURIComponent(url)}`;
      } else {
        // 搜索关键词处理，根据用户选择的搜索源
        if (searchSource === 'auto') {
          // 智能选择：使用后端的自动搜索逻辑（中文→TMDB→IMDb，英文→IMDb→TMDB）
          apiUrl = `/api?query=${encodeURIComponent(url)}`;
        } else {
          // 使用用户指定的搜索源
          apiUrl = `/api?source=${searchSource}&query=${encodeURIComponent(url)}`;
        }
      }
      
      const data = await fetchApiData(apiUrl);
      if (data.site && data.site.startsWith('search-')) {
        if (data.data && data.data.length > 0) {
          // 有搜索结果
          setSearchResults(data.data);
          setLastSearchSource(data.site); // 保存搜索来源
          setResult('');
          setFormattedResult(null);
        } else {
          // 其他搜索失败情况
          setError("未找到相关结果");
          setSearchResults(null);
          setLastSearchSource(null);
          setResult('');
          setFormattedResult(null);
        }
      } else {
        // 处理生成结果
        setResult(data.format || '');
        setFormattedResult({
          format: data.format || '',
          site: data.site || '',
          id: data.sid || data.id || ''
        });
        // 确保搜索结果状态被清除
        setSearchResults(null);
        setLastSearchSource(null);
      }
    } catch (err) {
      console.error('提交错误:', err);
      setError(err.message || "搜索失败");
      setSearchResults(null);
      setLastSearchSource(null);
      setResult('');
      setFormattedResult(null);
    } finally {
      setLoading(false);
    }
  };
  
  // 添加处理搜索结果选择的函数
  const handleSelectResult = async (link) => {
    setLoading(true);
    setError(null);
    setSearchResults(null);
    setResult('');
    setLastSearchSource(null);
    
    try {
      // 判断是豆瓣链接还是IMDb链接
      const isImdb = link.includes('imdb.com');
      const isTmdb = link.includes('themoviedb.org');
      
      let apiUrl = '';
      
      if (isImdb) {
        // 处理IMDb链接
        const imdbIdMatch = link.match(/tt(\d{7,})/);
        if (imdbIdMatch && imdbIdMatch[0]) {
          apiUrl = `/api?source=imdb&sid=${imdbIdMatch[0]}`;
        } else {
          // 如果无法提取IMDb ID，直接使用链接
          apiUrl = `/api?url=${encodeURIComponent(link)}`;
        }
      } else if (isTmdb) {
        // 处理TMDB链接
        const tmdbIdMatch = link.match(/movie\/(\d+)/) || link.match(/tv\/(\d+)/);
        if (tmdbIdMatch && tmdbIdMatch[1]) {
          // 修复：使用正确的捕获组，即数字ID部分
          const mediaType = link.includes('/movie/') ? 'movie' : 'tv';
          apiUrl = `/api?source=tmdb&sid=${mediaType}/${tmdbIdMatch[1]}`;
        } else {
          // 如果无法提取TMDB ID，直接使用链接
          apiUrl = `/api?url=${encodeURIComponent(link)}`;
        }
      } else {
        // 其他链接，直接使用
        apiUrl = `/api?url=${encodeURIComponent(link)}`;
      }
      
      const data = await fetchApiData(apiUrl);
      
      // 检查是否是错误响应
      if (data.success === false) {
        // 处理错误情况
        setError(data.message || data.error || "处理失败");
        setResult('');
        setFormattedResult(null);
      } else {
        // 处理生成结果
        setResult(data.format || '');
        setFormattedResult({
          format: data.format || '',
          site: data.site || '',
          id: data.sid || data.id || ''
        });
      }
      
      // 清除搜索结果状态
      setSearchResults(null);
      setLastSearchSource(null);
    } catch (err) {
      console.error('处理链接错误:', err);
      setError(err.message || '处理链接时发生错误');
      setResult('');
      setFormattedResult(null);
      setSearchResults(null);
      setLastSearchSource(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      // 使用自定义通知替代浏览器alert
      setShowCopyNotification(true);
      // 3秒后自动隐藏通知
      setTimeout(() => {
        setShowCopyNotification(false);
      }, 3000);
    }
  };

  const handleClear = () => {
    setUrl('');
    setResult('');
    setFormattedResult(null);
    setSearchResults(null);
    setLastSearchSource(null);
    setError(null);
    setSearchSource('auto'); // 重置搜索源为智能选择
  };

  // 渲染搜索结果项
  const renderSearchResultItem = (item, index) => (
    <li key={index} className="border-b border-gray-200 pb-2 last:border-0 last:pb-0">
      <button
        onClick={() => handleSelectResult(item.link || item.url)}
        className="text-indigo-600 hover:text-indigo-900 text-sm text-left w-full flex justify-between items-center"
      >
        <span>
          {item.title}
          {item.year && <span className="text-gray-500 ml-2">({item.year})</span>}
        </span>
        {renderEpisodeInfo(item)}
        {renderRatingInfo(item)}
      </button>
      <div className="flex justify-between items-center">
        {item.subtitle && (
          <p className="text-xs text-gray-500 mt-1 flex-1">{item.subtitle}</p>
        )}
        {item.subtype && (
          <span className="text-xs text-gray-400 ml-2">
            {getSubtypeLabel(item.subtype)}
          </span>
        )}
      </div>
    </li>
  );

  // 渲染集数信息
  const renderEpisodeInfo = (item) => {
    if (!item.episode) return null;
    return (
      <span className="text-indigo-700 text-xs bg-yellow-50 pl-1.5 py-0.5 rounded">
        {item.episode} 集
      </span>
    );
  };

  // 渲染评分信息
  const renderRatingInfo = (item) => {
    if (!item.rating) return null;
    return (
      <span className="text-indigo-700 text-xs bg-yellow-50 pl-1.5 py-0.5 rounded">
        {item.rating} / 10
      </span>
    );
  };

  // 获取媒体类型标签
  const getSubtypeLabel = (subtype) => {
    const subtypeMap = {
      'movie': '电影',
      'tv': '电视剧',
      'tvSeries': '电视剧',
      'tvMovie': '电视电影',
      'video': '视频',
      'tvSpecial': '特别篇',
      'short': '短片'
    };
    
    return subtypeMap[subtype] || subtype;
  };

  // 获取搜索来源标签
  const getSearchSourceLabel = () => {
    const sourceMap = {
      'search-douban': '豆瓣',
      'search-tmdb': 'TMDB',
      'search-imdb': 'IMDb'
    };
    
    return sourceMap[lastSearchSource] || '未知来源';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img 
                src="data:image/png;base64,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" 
                alt="PT-Gen Logo" 
                className="h-8 w-8 mr-2"
              />
              <h1 className="text-xl font-medium text-gray-900">PT-Gen</h1>
            </div>
            <nav className="flex space-x-4">
              <a 
                href="https://github.com/rabbitwit/PT-Gen-Refactor" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center space-x-2 rounded-md bg-gray-100 px-3 py-2 text-sm hover:bg-gray-200"
              >
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path>
                  <path d="M9 18c-4.51 2-5-2-7-2"></path>
                </svg>
                <span>GitHub</span>
              </a>
            </nav>
          </div>
        </div>
      </header>
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        {/* Search Section Card */}
        <div className="bg-white shadow rounded-lg p-5 mb-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
                资源链接或关键词
              </label>
              <input
                type="text"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="请输入资源链接或搜索关键词"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
              />
            </div>
            
            {/* 搜索源选择器 - 仅在输入关键词时显示 */}
            {url && !url.startsWith('http') && (
              <div>
                <label htmlFor="searchSource" className="block text-sm font-medium text-gray-700 mb-2">
                  搜索引擎
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                  {searchSourceOptions.map((option) => (
                    <label
                      key={option.value}
                      className={`relative flex cursor-pointer rounded-lg border p-3 focus:outline-none ${
                        searchSource === option.value
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                          : 'border-gray-300 bg-white text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="searchSource"
                        value={option.value}
                        checked={searchSource === option.value}
                        onChange={(e) => setSearchSource(e.target.value)}
                        className="sr-only"
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{option.label}</span>
                        <span className="text-xs text-gray-500 mt-1">{option.description}</span>
                      </div>
                      {searchSource === option.value && (
                        <div className="absolute -inset-px rounded-lg border-2 border-indigo-500 pointer-events-none" />
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    查询中...
                  </>
                ) : '查询'}
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="ml-2 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                清空
              </button>
            </div>
          </form>
        </div>

        {/* Result Section */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {searchResults && searchResults.length > 0 && (
          <div className="bg-white shadow rounded-lg p-5 mb-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium text-gray-900">搜索结果</h3>
              <span className="text-sm text-gray-500">
                {getSearchSourceLabel()}
              </span>
            </div>
            <ul className="space-y-2">
              {searchResults.map(renderSearchResultItem)}
            </ul>
          </div>
        )}

        {result && (
          <div className="bg-white shadow rounded-lg p-5">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center">
                <h3 className="text-lg font-medium text-gray-900">格式化结果</h3>
                {formattedResult && formattedResult.site && (
                  <span className="ml-2 px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded-full">
                    来源: {formattedResult.site}
                  </span>
                )}
              </div>
              <button
                onClick={handleCopy}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
              >
                <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                复制
              </button>
            </div>
            <div className="bg-gray-50 p-4 rounded-md overflow-x-auto">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap">{result}</pre>
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="bg-white shadow rounded-lg p-5 mt-5">
          <h3 className="text-lg font-medium text-gray-900 mb-3">使用说明</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
            <li>支持多种资源站点：
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>🎬 豆瓣：电影、电视剧 (中文搜索推荐)</li>
                <li>🎪 IMDb：电影、电视剧 (英文搜索推荐)</li>
                <li>🎭 TMDB：电影、电视剧 (需要API密钥)</li>
                <li>📺 Bangumi：动画</li>
                <li>🎮 Steam：游戏链接</li>
                <li>🎵 Melon：音乐专辑链接</li>
              </ul>
            </li>
            <li><strong>搜索源选择</strong>：输入关键词时可选择搜索引擎：
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>🤖 <strong>智能选择</strong>：中文使用TMDB（回退IMDb），英文使用IMDb（回退TMDB）</li>
                <li>🎬 <strong>豆瓣</strong>：最适合中文电影/电视剧搜索</li>
                <li>🎭 <strong>TMDB</strong>：国际化搜索，支持多语言</li>
                <li>🎪 <strong>IMDb</strong>：最适合英文电影/电视剧搜索</li>
              </ul>
            </li>
            <li>直接输入URL链接会自动识别并处理（无需选择搜索源）</li>
            <li>在搜索结果中点击选择匹配的条目</li>
            <li>复制生成的格式化内容到PT站点发布资源</li>
          </ul>
          
          <h4 className="text-sm font-medium text-gray-900 mt-3 mb-2">功能特点</h4>
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
            <li>🔍 <strong>多引擎搜索</strong>：支持豆瓣、IMDb、TMDB三大搜索引擎</li>
            <li>🤖 <strong>智能推荐</strong>：根据输入语言自动推荐最佳搜索源</li>
            <li>📋 <strong>标准格式</strong>：自动生成PT站点标准描述格式</li>
            <li>🌐 <strong>多语言支持</strong>：完美支持中英文搜索</li>
            <li>📱 <strong>响应式设计</strong>：支持手机、平板、电脑等设备</li>
          </ul>
        </div>
      </main>

      {/* Copy Notification */}
      {showCopyNotification && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
          <div className="bg-purple-100 text-purple-800 px-4 py-2 rounded-md shadow-lg transform transition-all duration-300 ease-in-out">
            <div className="flex items-center">
              <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium">已复制到剪贴板</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;