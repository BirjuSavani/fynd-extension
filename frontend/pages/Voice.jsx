import axios from 'axios';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import urlJoin from 'url-join';

const EXAMPLE_MAIN_URL = window.location.origin;

export const Voice = () => {
  const [productFilterList, setProductFilterList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false); // State for loader
  const { transcript, listening, resetTranscript } = useSpeechRecognition();
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const { company_id , application_id} = useParams();
  // const application_id = '672ddc7346bed2c768faf043';
  // const application_id = localStorage.getItem('application_id');
  // const company_id = '9095';
  // const company_id = localStorage.getItem('company_id');
  let silenceTimer = null;
 
  console.log(application_id, company_id,"IDS");

  useEffect(() => {
    fetchApplications();
    // fetchToken();
  }, []);

  useEffect(() => {
    // fetchToken();
    // fetchApplications();
    if (listening) {
      setSearchQuery(transcript);

      if (silenceTimer) clearTimeout(silenceTimer);

      silenceTimer = setTimeout(() => {
        SpeechRecognition.stopListening();
        fetchApplicationProductsBaseOnFilter(transcript);
      }, 3000);
    }

    return () => {
      if (silenceTimer) clearTimeout(silenceTimer);
    };
  }, [transcript, listening]);

  const toggleListening = () => {
    if (listening) {
      SpeechRecognition.stopListening();
      fetchApplicationProductsBaseOnFilter(transcript);
    } else {
      resetTranscript();
      setSearchQuery('');
      SpeechRecognition.startListening({ continuous: true });
    }
  };

  const fetchApplicationProductsBaseOnFilter = async (query) => {
    if (!query) return;
    setLoading(true); // Show loader when fetching starts
    try {
      const { data } = await axios.get(urlJoin(EXAMPLE_MAIN_URL, `/api/products/applications/${application_id}`), {
        headers: { 'x-company-id': company_id },
        params: { query },
      });
      setProductFilterList(data.items);
    } catch (e) {
      console.error('Error fetching application products:', e);
    }
    setLoading(false); // Hide loader after fetching
  };

  const fetchToken = async () => {
    try {
      const { data } = await axios.get(urlJoin(EXAMPLE_MAIN_URL, '/api/company/all-token'), {
        params: { company_id: company_id },
      });
      console.log(data);
      if (data?.companyId) {
        localStorage.setItem('company_id', data.companyId);
        console.log('Company ID saved successfully');
      } else {
        console.warn('Company ID not found in response');
      }
    } catch (error) {
      console.error('Error fetching Token:', error.message);
    }
  };

  const fetchApplications = async () => {
    try {
      const response = await axios.get(urlJoin(EXAMPLE_MAIN_URL, '/api/application/all-applications'), {
        params: { company_id: company_id },
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.data) {
        setCompanies(response.data); // Save fetched applications in state
      }
      console.log('Applications:', response.data);
      return response.data; // Return data for further use if needed
    } catch (error) {
      console.error('Error fetching applications:', error.message);
    }
  };

  const stripHtml = (html) => {
    html = html.replace(/<style[^>]*>.*?<\/style>/gs, '');
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Voice Search for Products</h2>

      <div style={styles.companyWrapper}>
        {companies.map((company) => (
          <div
            key={company._id}
            style={{
              ...styles.companyBox,
              backgroundColor: application_id === company._id ? '#007bff' : '#f8f9fa',
              color: application_id === company._id ? '#fff' : '#333',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px',
              cursor: 'pointer',
            }}
            onClick={() => {
              localStorage.setItem('application_id', company._id);
              setSelectedCompany(company); // Update selected company
            }}
          >
            <img src={company.logo} alt={company.name} style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
            {company.name}
          </div>
        ))}
      </div>

      {/* Show Voice Search only if a company is selected */}
      {selectedCompany && (
        <>
          <div style={styles.inputContainer}>
            <input type="text" value={searchQuery} placeholder="Search for products..." readOnly style={styles.input} />
            <span onClick={toggleListening} style={styles.micButton}>
              {listening ? (
                <i className="fa-solid fa-microphone fa-fade"></i>
              ) : (
                <i className="fa-solid fa-microphone"></i>
              )}
            </span>
          </div>

          {loading && (
            <div style={styles.loader}>
              <i className="fa-solid fa-spinner fa-spin"></i> Loading...
            </div>
          )}

          <div style={styles.grid}>
            {productFilterList?.length > 0
              ? productFilterList.map((product, index) => (
                  <div key={index} style={styles.productCard}>
                    {product.media?.length > 0 && (
                      <img src={product.media[0].url} alt={product.name} style={styles.productImage} />
                    )}
                    <div style={styles.productDetails}>
                      <h3 style={styles.productName}>{product.name}</h3>
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
              : searchQuery && !loading && <p style={styles.noResults}>No products found. Try another search.</p>}
          </div>
        </>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '10px',
    boxShadow: '0px 4px 8px rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '20px',
    color: '#333',
  },
  inputContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '20px',
    border: '1px solid #ccc',
    borderRadius: '8px',
    padding: '10px',
  },
  input: {
    flex: 1,
    padding: '10px',
    fontSize: '16px',
    border: 'none',
    outline: 'none',
  },
  micButton: {
    cursor: 'pointer',
    fontSize: '22px',
    padding: '10px',
    borderRadius: '50%',
    transition: 'background 0.2s ease-in-out',
  },
  loader: {
    textAlign: 'center',
    fontSize: '18px',
    color: '#555',
    marginBottom: '15px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', // Responsive grid
    gap: '15px',
    marginTop: '20px',
  },
  productCard: {
    display: 'flex',
    flexDirection: 'column', // Makes the layout vertical (image above, content below)
    alignItems: 'center',
    border: '1px solid #E2E8F0',
    padding: '12px',
    borderRadius: '8px',
    boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
    backgroundColor: '#F9F9F9',
    textAlign: 'left',
  },
  productImage: {
    width: '100%', // Ensures full width
    height: '210px', // Set a fixed height
    objectFit: 'cover', // Ensures the image fits nicely
    borderRadius: '8px 8px 0 0', // Rounded corners on top
  },
  productDetails: {
    padding: '10px', // Space between image and content
    width: '100%', // Full width
  },
  productName: {
    fontWeight: 'bold',
    fontSize: '16px',
    marginBottom: '5px',
    textAlign: 'center',
  },
  noResults: {
    textAlign: 'center',
    color: '#718096',
    marginTop: '10px',
  },
  companyWrapper: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    marginBottom: '20px',
    justifyContent: 'center',
  },

  companyBox: {
    padding: '10px 15px',
    border: '1px solid #ccc',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background 0.3s, color 0.3s',
    minWidth: '120px',
    textAlign: 'center',
  },
};
