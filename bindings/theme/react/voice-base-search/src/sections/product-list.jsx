import axios from 'axios';
import React,{ useCallback, useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
// import '../styles/style.css';

export function Component({ props }) {
  const application_id = '672ddc7346bed2c768faf043';
  const company_id = '9095';
  const [productFilterList, setProductFilterList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [lastProcessedTranscript, setLastProcessedTranscript] = useState('');
  const [isVoiceSearchActive, setIsVoiceSearchActive] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const silenceTimerRef = useRef(null);
  const lastTranscriptRef = useRef('');
  const silenceTimestampRef = useRef(null);

  // Define base URL to avoid repeated strings
  const API_BASE_URL = 'ext/db/api/proxy';

  const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition();

  useEffect(() => {
    // Dynamically load Font Awesome
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css';
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, []);

  // Check browser support
  useEffect(() => {
    console.log('SpeechRecognition supported:', browserSupportsSpeechRecognition);
    if (!browserSupportsSpeechRecognition) {
      alert("Your browser doesn't support speech recognition. Try using Chrome.");
    }
  }, [browserSupportsSpeechRecognition]);

  // Fetch applications on component mount
  useEffect(() => {
    fetchApplications();
    // Don't fetch products initially - wait for user input
  }, []);

  // Improved silence detection - more accurate tracking of when speech stops
  useEffect(() => {
    // Only monitor when listening is active
    if (!listening) return;

    // Check if transcript has changed
    if (transcript !== lastTranscriptRef.current) {
      console.log('Speech detected, resetting silence timer');
      lastTranscriptRef.current = transcript;
      silenceTimestampRef.current = Date.now();

      // Clear any existing timer
      if (silenceTimerRef.current) {
        clearInterval(silenceTimerRef.current);
      }
    }

    // Start interval to check for silence
    silenceTimerRef.current = setInterval(() => {
      if (listening && silenceTimestampRef.current) {
        const silenceDuration = Date.now() - silenceTimestampRef.current;

        // If 3 seconds of silence has passed and we have some transcript
        if (silenceDuration > 3000 && transcript.trim().length > 0) {
          console.log(`No speech detected for ${silenceDuration}ms, stopping mic`);
          SpeechRecognition.stopListening();
          // setIsVoiceSearchActive(false); // Ensure this is set to false to trigger search
          clearInterval(silenceTimerRef.current);
        }
      }
    }, 500); // Check every 500ms

    return () => {
      if (silenceTimerRef.current) {
        clearInterval(silenceTimerRef.current);
      }
    };
  }, [listening, transcript]);

  // Debounced search function
  const debouncedSearch = useCallback(
    (query) => {
      if (query && query !== lastProcessedTranscript) {
        setLastProcessedTranscript(query);
        fetchApplicationProductsBaseOnFilter(query);
      }
    },
    [lastProcessedTranscript]
  );

  // Process voice transcript with a delay to wait for complete phrases
  useEffect(() => {
    if (!listening && transcript && isVoiceSearchActive) {
      // Only search when user stops speaking
      console.log('Voice search completed with:', transcript);
      setSearchQuery(transcript);
      debouncedSearch(transcript);
      setIsVoiceSearchActive(false);
    }
  }, [listening, transcript, isVoiceSearchActive, debouncedSearch]);

  // const toggleListening = () => {
  //   if (listening) {
  //     SpeechRecognition.stopListening();
  //     setIsVoiceSearchActive(false);
  //   } else {
  //     resetTranscript();
  //     lastTranscriptRef.current = '';
  //     silenceTimestampRef.current = Date.now();
  //     setIsVoiceSearchActive(true);
  //     SpeechRecognition.startListening({ continuous: true });
  //   }
  // };
  const toggleListening = () => {
    if (listening) {
      // User clicked mic again while it's still listening (early stop)
      SpeechRecognition.stopListening();

      // If there's a transcript, process it
      if (transcript.trim()) {
        console.log('Mic stopped early. Using transcript:', transcript);
        setSearchQuery(transcript);
        debouncedSearch(transcript);
      }

      setIsVoiceSearchActive(false);
    } else {
      // Start listening
      resetTranscript(); // Clear previous transcript
      lastTranscriptRef.current = '';
      silenceTimestampRef.current = Date.now();
      setIsVoiceSearchActive(true);
      SpeechRecognition.startListening({ continuous: true });
    }
  };

  const fetchApplicationProductsBaseOnFilter = async (query) => {
    if (!query.trim()) return; // Don't search with empty query

    setLoading(true);
    console.log('Fetching products with query:', query);
    try {
      const { data } = await axios.get(`${API_BASE_URL}/${application_id}/products`, {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        params: {
          query: query,
          company_id: company_id,
        },
        withCredentials: true,
      });

      console.log('Product data received:', data);
      setProductFilterList(data.items || []);
      setShowPopup(true); // Show popup when products are fetched
    } catch (e) {
      console.error('Error fetching products:', e);
    }
    setLoading(false);
  };

  const fetchApplications = async () => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/all-applications`, {
        params: { company_id },
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        withCredentials: true,
      });
      setCompanies(data);
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  };

  const handleManualSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      fetchApplicationProductsBaseOnFilter(searchQuery);
    }
  };

  const handleSearchInputChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleFinishVoiceSearch = () => {
    if (transcript) {
      console.log('Using final transcript:', transcript);
      setSearchQuery(transcript);
      fetchApplicationProductsBaseOnFilter(transcript);
    }
    SpeechRecognition.stopListening();
    setIsVoiceSearchActive(false);
  };

  // Navigate to product page with proper URL format for GQL
  const navigateToProduct = (product) => {
    // Create slug from product name if not available
    const slug = product.slug || product.name.toLowerCase().replace(/\s+/g, '-');

    // Get product ID and ensure it's available
    const productId = product.id || '';
    if (!productId) {
      console.error('Product ID is missing', product);
      return;
    }

    // Format URL for GQL compatibility
    // Using "intech-shoes.fynd.io" as the domain as per example
    const productUrl = `https://intech-shoes.fynd.io/product/${slug}`;

    // Open in new tab so user doesn't lose their search results
    window.open(productUrl, '_blank');
    // window.open(productUrl,'_self');
  };

  const closePopup = () => {
    setShowPopup(false);
  };

  const title = props?.title?.value ?? 'Voice Search Products';

  return (
    <div
      style={{
        fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
        padding: '20px',
        maxWidth: '1200px',
        margin: 'auto',
        background: '#fff',
        color: '#222',
        position: 'relative',
      }}
    >
      <Helmet>
        <title>{title}</title>
      </Helmet>

      {/* Voice Button */}
      {/* Voice Button */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
        <button
          type="button"
          onClick={toggleListening}
          title="Voice Search"
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              border: `2px solid ${listening ? '#43a047' : 'black'}`,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: listening ? 'pulse 1.2s infinite' : 'none',
              transition: 'border-color 0.3s ease',
            }}
          >
            <i
              className="fas fa-microphone"
              style={{
                color: 'black',
                fontSize: '20px',
                transition: 'color 0.3s ease',
              }}
            ></i>
          </div>
        </button>
      </div>

      <style>
        {`
    @keyframes pulse {
      0% {
        transform: scale(1);
        box-shadow: 0 0 0 0 rgba(67, 160, 71, 0.6);
      }
      70% {
        transform: scale(1.1);
        box-shadow: 0 0 0 8px rgba(67, 160, 71, 0);
      }
      100% {
        transform: scale(1);
        box-shadow: 0 0 0 0 rgba(67, 160, 71, 0);
      }
    }
  `}
      </style>

      {/* Voice Feedback */}
      {listening && (
        <div
          style={{
            textAlign: 'center',
            marginBottom: '20px',
            backgroundColor: '#f8f9fa',
            padding: '15px',
            borderRadius: '10px',
            maxWidth: '400px',
            margin: '0 auto 20px',
          }}
        >
          <p style={{ fontWeight: 'bold' }}>Listening...</p>
          <p
            style={{
              fontStyle: 'italic',
              color: '#555',
              marginTop: '8px',
              backgroundColor: '#fff',
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid #eee',
              minHeight: '40px',
            }}
          >
            {transcript || 'Say something...'}
          </p>
          {/* <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '12px' }}>
          Microphone will turn off automatically after 3 seconds of silence
        </p> */}
        </div>
      )}

      {/* Hidden Form */}
      <div style={{ display: 'none' }}>
        <form onSubmit={handleManualSearch}>
          <input type="text" value={searchQuery} onChange={handleSearchInputChange} />
          <button type="submit">Search</button>
          <button type="button" onClick={handleFinishVoiceSearch}>
            Use Voice
          </button>
        </form>
      </div>

      {/* Search Query Message */}
      {searchQuery && !listening && !showPopup && (
        <div
          style={{
            textAlign: 'center',
            marginBottom: '20px',
            backgroundColor: '#f1f1f1',
            padding: '10px',
            borderRadius: '20px',
            maxWidth: '500px',
            margin: '0 auto',
          }}
        >
          <p>
            {/* <span style={{ fontWeight: 'bold' }}>Searched for: </span> */}
            <span style={{ color: '#e53935', fontWeight: '500' }}>{searchQuery}</span>
          </p>
        </div>
      )}

      {/* Popup for Results */}
      {showPopup && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '10px',
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '20px',
              width: '100%',
              maxWidth: '900px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                borderBottom: '1px solid #eee',
                paddingBottom: '10px',
              }}
            >
              <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Results for "{searchQuery}"</h2>
              <button
                onClick={closePopup}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#555',
                }}
              >
                ×
              </button>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '30px' }}>
                <div
                  style={{
                    display: 'inline-block',
                    width: '40px',
                    height: '40px',
                    border: '4px solid #f3f3f3',
                    borderTop: '4px solid #e53935',
                    borderRadius: '50%',
                    marginBottom: '15px',
                    animation: 'spin 1s linear infinite',
                  }}
                ></div>
                <p>Loading products...</p>
              </div>
            ) : (
              <>
                {productFilterList.length > 0 ? (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                      gap: '20px',
                    }}
                  >
                    {productFilterList.map((product, index) => (
                      <div
                        key={index}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          backgroundColor: '#fafafa',
                          border: '1px solid #e0e0e0',
                          borderRadius: '12px',
                          padding: '15px',
                          cursor: 'pointer',
                          boxShadow: '0 2px 5px rgba(0, 0, 0, 0.05)',
                          transition: 'all 0.3s ease',
                          height: '450px',
                        }}
                        onClick={() => navigateToProduct(product)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.1)';
                          e.currentTarget.style.transform = 'translateY(-3px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.05)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        {/* Product Image */}
                        <div style={{ height: '200px', overflow: 'hidden', marginBottom: '15px' }}>
                          {product.media?.length > 0 ? (
                            <img
                              src={product.media[0].url}
                              alt={product.name}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                borderRadius: '8px',
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: '100%',
                                height: '100%',
                                backgroundColor: '#eee',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#aaa',
                              }}
                            >
                              No Image
                            </div>
                          )}
                        </div>

                        {/* Product Info */}
                        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                          <h3
                            style={{
                              fontSize: '1.1rem',
                              marginBottom: '10px',
                              color: '#333',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {product.name}
                          </h3>

                          {/* Price */}
                          {product.price?.effective?.min && (
                            <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#678391' }}>
                              ₹{product.price.effective.min.toFixed(2)}{' '}
                              {product.price?.marked?.max && (
                                <span
                                  style={{
                                    fontSize: '0.9rem',
                                    color: '#999',
                                    textDecoration: 'line-through',
                                    marginLeft: '8px',
                                    fontWeight: 'normal',
                                  }}
                                >
                                  ₹{product.price.marked.max.toFixed(2)}
                                </span>
                              )}
                            </p>
                          )}

                          {/* Brand/Category */}
                          <div style={{ height: '100px', overflow: 'hidden' }}>
                            {product.brand && (
                              <p style={{ color: '#555', margin: '5px 0' }}>Brand: {product.brand.name}</p>
                            )}
                            {product.category_slug && (
                              <p style={{ color: '#555', margin: '5px 0' }}>
                                Category: {product.category_slug.replace(/-/g, ' ')}
                              </p>
                            )}
                            {product.color && <p style={{ color: '#555', margin: '5px 0' }}>Colors: {product.color}</p>}
                          </div>

                          {/* View Details */}
                          <div
                            style={{
                              backgroundColor: '#3465a4',
                              color: 'white',
                              padding: '10px',
                              borderRadius: '5px',
                              textAlign: 'center',
                              fontSize: '0.95rem',
                              fontWeight: '500',
                              marginTop: 'auto',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            }}
                          >
                            View Details
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: '#888', marginTop: '30px' }}>
                    <p>No products found matching your search</p>
                    <p style={{ fontSize: '0.9rem', marginTop: '10px' }}>
                      Try different keywords or click the microphone to search again
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Message below voice search */}
      {!showPopup && (
        <div
          style={{
            marginTop: '30px',
            textAlign: 'center',
            padding: '20px',
            backgroundColor: '#f9f9f9',
            borderRadius: '10px',
            maxWidth: '600px',
            margin: '30px auto',
          }}
        >
          {loading ? (
            <p style={{ fontSize: '1.2rem', color: '#888' }}>Loading products...</p>
          ) : (
            <>
              {/* <p style={{ fontSize: '1.2rem', color: '#555', marginBottom: '15px' }}>
              {searchQuery ? 'Click microphone to search again' : 'Start voice search to find products'}
            </p> */}
              {!searchQuery && <p style={{ fontSize: '0.9rem', color: '#777' }}>Just Say It - We'll Do the Rest 😊</p>}
            </>
          )}
        </div>
      )}

      {/* CSS Keyframes */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(229, 57, 53, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(229, 57, 53, 0); }
          100% { box-shadow: 0 0 0 0 rgba(229, 57, 53, 0); }
        }
      `,
        }}
      />
    </div>
  );
}

export const settings = {
  label: 'Voice Search Product List',
  name: 'product-list',
  props: [
    {
      id: 'title',
      label: 'Page Title',
      type: 'text',
      default: 'Voice Search Products',
      info: 'Page Title',
    },
  ],
  blocks: [],
};
