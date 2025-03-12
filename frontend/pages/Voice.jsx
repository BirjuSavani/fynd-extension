import axios from 'axios';
import { useState } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import urlJoin from 'url-join';

const EXAMPLE_MAIN_URL = window.location.origin;

export const Voice = () => {
  const [productFilterList, setProductFilterList] = useState([]);
  const { transcript, listening, resetTranscript } = useSpeechRecognition();
  // const [companyId, setCompanyId] = useState('');
  // const [applicationId, setApplicationId] = useState('');

  // Extract query parameters from URL
  // useEffect(() => {
  //   const queryParams = new URLSearchParams(window.location.search);
    console.log(window.location.href);
    console.log(window.location);
  //   setCompanyId(queryParams.get('company_id') || '');
  //   setApplicationId(queryParams.get('application_id') || '');
  // }, []);
  // console.log(companyId, applicationId, 'company');
  const application_id = '672ddc7346bed2c768faf043';
  // const application_id = '67973abe4d4806f9d5fcaaa3';

  const company_id = '9095';

  const toggleListening = () => {
    if (listening) {
      SpeechRecognition.stopListening();
      fetchApplicationProductsBaseOnFilter(transcript);
    } else {
      resetTranscript();
      SpeechRecognition.startListening({ continuous: true });
    }
  };

  const fetchApplicationProductsBaseOnFilter = async (query) => {
    if (!query) return;
    try {
      const { data } = await axios.get(urlJoin(EXAMPLE_MAIN_URL, `/api/products/applications/${application_id}`), {
        headers: { 'x-company-id': company_id },
        params: { query },
      });
      setProductFilterList(data.items);
    } catch (e) {
      console.error('Error fetching application products:', e);
    }
  };

  const handleReset = () => {
    resetTranscript();
    setProductFilterList([]);
  };

  const stripHtml = (html) => {
    // Remove <style> tags and their content
    html = html.replace(/<style[^>]*>.*?<\/style>/gs, '');

    // Parse remaining HTML and extract text
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  };

  return (
    <div
      style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '20px',
        backgroundColor: 'white',
        boxShadow: '0px 4px 6px rgba(0,0,0,0.1)',
        borderRadius: '10px',
      }}
    >
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', textAlign: 'center', marginBottom: '20px' }}>
        🎙️ Voice Search for Products
      </h2>

      <div
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginBottom: '20px' }}
      >
        <button
          onClick={toggleListening}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            fontWeight: 'bold',
            boxShadow: '0px 2px 4px rgba(0,0,0,0.2)',
            backgroundColor: listening ? '#E53E3E' : '#3182CE',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            transition: 'background-color 0.3s',
          }}
        >
          {listening ? '🛑 Stop Listening' : '🎤 Start Voice Search'}
        </button>

        <button
          onClick={handleReset}
          style={{
            backgroundColor: '#718096',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0px 2px 4px rgba(0,0,0,0.2)',
          }}
        >
          🔄 Reset
        </button>
      </div>

      {transcript && (
        <p style={{ fontSize: '18px', textAlign: 'center', color: '#2D3748', fontWeight: '500' }}>
          <strong>Search Query:</strong> <span style={{ color: '#3182CE' }}>&quot;{transcript}&quot;</span>
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '20px' }}>
        {productFilterList.length > 0 ? (
          productFilterList.map((product, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                border: '1px solid #E2E8F0',
                padding: '10px',
                borderRadius: '8px',
                boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
                backgroundColor: '#F7FAFC',
              }}
            >
              {product.media && product.media.length > 0 && (
                <img
                  src={product.media[0].url}
                  alt={product.name}
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '8px',
                    objectFit: 'cover',
                    marginRight: '15px',
                  }}
                />
              )}
              <div>
                <h3 style={{ fontWeight: 'bold', fontSize: '16px' }}>{product.name}</h3>
                <p>
                  <strong>Brand:</strong> {product.brand?.name || 'N/A'}
                </p>
                <p>
                  <strong>Category:</strong> {product.category_slug || 'N/A'}
                </p>
                <p>
                  <strong>Color:</strong> {product.color || 'N/A'}
                </p>
                <p>
                  <strong>Price:</strong>{' '}
                  {product.price?.effective?.min
                    ? `${product.price.effective.currency_symbol || '₹'}${product.price.effective.min}`
                    : 'N/A'}
                </p>
                <p>
                  <strong>Description:</strong> {stripHtml(product.description) || 'N/A'}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p style={{ textAlign: 'center', color: '#718096', marginTop: '10px' }}>
            No products found. Try another search.
          </p>
        )}
      </div>
    </div>
  );
};
