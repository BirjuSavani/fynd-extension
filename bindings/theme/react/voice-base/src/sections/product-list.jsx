import axios from 'axios';
import React, { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import '../styles/style.css';

export function Component({ props }) {
  const application_id = '672ddc7346bed2c768faf043';
  const company_id = '9095';
  const [productFilterList, setProductFilterList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [lastProcessedTranscript, setLastProcessedTranscript] = useState('');
  const [isVoiceSearchActive, setIsVoiceSearchActive] = useState(false);

  // Define base URL to avoid repeated strings
  // const API_BASE_URL = 'https://lending-blowing-fl-real.trycloudflare.com';
  const API_BASE_URL = 'https://formerly-perfume-takes-gibson.trycloudflare.com/api/application';
  // const API_BASE_URL_2 = '/api';

  const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition();

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

  const toggleListening = () => {
    if (listening) {
      SpeechRecognition.stopListening();
    } else {
      resetTranscript();
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
      }}
    >
      <Helmet>
        <title>{title}</title>
      </Helmet>

      <h1 style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: '30px', fontWeight: 600 }}>{title}</h1>

      {/* Voice Button */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
        <button
          type="button"
          onClick={toggleListening}
          style={{
            backgroundColor: listening ? '#43a047' : '#e53935',
            border: 'none',
            color: 'white',
            borderRadius: '50%',
            width: '80px',
            height: '80px',
            fontSize: '36px',
            cursor: 'pointer',
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
            transition: 'transform 0.2s ease',
          }}
        >
          <span>{listening ? '🎙️' : '🎤'}</span>
        </button>
      </div>

      {/* Voice Feedback */}
      {listening && (
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <p>Listening...</p>
          <p style={{ fontStyle: 'italic', color: '#555', marginTop: '8px' }}>{transcript || 'Say something...'}</p>
        </div>
      )}

      {/* Hidden Form & Inputs (preserved) */}
      <div style={{ display: 'none' }}>
        <form onSubmit={handleManualSearch}>
          <input type="text" value={searchQuery} onChange={handleSearchInputChange} />
          <button type="submit">Search</button>
          <button type="button" onClick={handleFinishVoiceSearch}>
            Use Voice
          </button>
        </form>
      </div>

      {/* Results */}
      <div style={{ marginTop: '30px' }}>
        {loading ? (
          <p style={{ textAlign: 'center', fontSize: '1.2rem', color: '#888', marginTop: '30px' }}>
            Loading products...
          </p>
        ) : (
          <>
            <h2
              style={{
                textAlign: 'center',
                fontSize: '1.8rem',
                marginBottom: '20px',
                borderBottom: '2px solid #eee',
                paddingBottom: '10px',
              }}
            >
              Search Results
            </h2>

            {productFilterList.length > 0 ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: '20px',
                  padding: '0 10px',
                }}
              >
                {productFilterList.map((product, index) => (
                  <div
                    key={index}
                    style={{
                      backgroundColor: '#fafafa',
                      border: '1px solid #e0e0e0',
                      borderRadius: '12px',
                      padding: '15px',
                      transition: 'box-shadow 0.3s ease',
                      boxShadow: '0 0 0 transparent',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.1)')}
                    onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 0 0 transparent')}
                  >
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '10px' }}>{product.name}</h3>
                    {product.price?.effective?.min && (
                      <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#e53935' }}>
                        ₹{product.price.effective.min.toFixed(2)}
                      </p>
                    )}
                    {product.brand && <p>Brand: {product.brand.name}</p>}
                    {product.category_slug && <p>Category: {product.category_slug.replace(/-/g, ' ')}</p>}
                    {product.color && <p>Colors: {product.color}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ textAlign: 'center', fontSize: '1.2rem', color: '#888', marginTop: '30px' }}>
                {searchQuery ? 'No products found matching your search' : 'Start voice search to find products'}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export const settings = {
  label: 'Product List INTECH',
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
