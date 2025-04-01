import axios from 'axios';
import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSpeechRecognition } from 'react-speech-recognition';
import { ProductCard } from '../components/ProductCard';

export function Component({ props }) {
  const application_id = '672ddc7346bed2c768faf043';
  const company_id = '9095';
  const [productFilterList, setProductFilterList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState([]);

  const { transcript } = useSpeechRecognition();

  const state = fpi.store.getState();
  const id = window.APP_DATA.applicationID;
  const company = fpi.getters.THEME(state)?.company_id;
  console.log(id, company, 'ID and Company');

  useEffect(() => {
    fetchApplications();
  }, []);

  useEffect(() => {
    if (transcript) {
      setSearchQuery(transcript);
      fetchApplicationProductsBaseOnFilter(transcript);
    }
  }, [transcript]);

  const fetchApplicationProductsBaseOnFilter = async (query) => {
    if (!query) return;
    setLoading(true);
    try {
      const { data } = await axios.get(
        `https://gel-frog-slides-governance.trycloudflare.com/api/products/applications/${application_id}`,
        {
          headers: { 'x-company-id': company_id },
          params: { query },
        }
      );
      setProductFilterList(data.items);
    } catch (e) {
      console.error('Error fetching products:', e);
    }
    setLoading(false);
  };

  const fetchApplications = async () => {
    try {
      const { data } = await axios.get(
        'https://gel-frog-slides-governance.trycloudflare.com/api/application/all-applications',
        {
          params: { company_id },
          headers: { 'Content-Type': 'application/json' },
        }
      );
      setCompanies(data);
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  };

  const title = props?.title?.value ?? 'Voice Search';

  return (
    <div>
      <Helmet>
        <title>{title}</title>
      </Helmet>
      <h1>{title}</h1>

      <ProductCard />
    </div>
  );
}

export const settings = {
  label: 'Voice Search',
  name: 'voice-search',
  props: [
    {
      id: 'title',
      label: 'Page Title',
      type: 'text',
      default: 'Voice Search',
      info: 'Title of the voice search page.',
    },
  ],
  blocks: [],
};

// export { Component, settings };
