import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useSpeechRecognition } from 'react-speech-recognition';
import { Helmet } from 'react-helmet-async';
import { VoiceButton } from '../components/ProductCard';

export function Component({ props }) {
  const application_id = '672ddc7346bed2c768faf043';
  // const application_id = localStorage.getItem('application_id');
  const company_id = '9095';

  // const company_id = localStorage.getItem('company_id');
  const [productFilterList, setProductFilterList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState([]);

  const { transcript } = useSpeechRecognition();

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
      const { data } = await axios.get(`/api/products/applications/${application_id}`, {
        headers: { 'x-company-id': company_id },
        params: { query },
      });
      setProductFilterList(data.items);
    } catch (e) {
      console.error('Error fetching products:', e);
    }
    setLoading(false);
  };

  const fetchApplications = async () => {
    try {
      const { data } = await axios.get('/api/application/all-applications', {
        params: { company_id },
        headers: { 'Content-Type': 'application/json' },
      });
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

      <VoiceButton />
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
    {
      id: 'accessToken',
      label: 'Access Token',
      type: 'text',
      default: '',
      required: true,
      info: 'Your API access token.',
    },
  ],
  blocks: [],
};

export default {
  Component,
  settings,
};
