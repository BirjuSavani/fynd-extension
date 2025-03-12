// import axios from 'axios';
// import { useEffect, useState } from 'react';
// import { useParams } from 'react-router-dom';
// import urlJoin from 'url-join';
// import DEFAULT_NO_IMAGE from '../public/assets/default_icon_listing.png';
// import greenDot from '../public/assets/green-dot.svg';
// import grayDot from '../public/assets/grey-dot.svg';
// import loaderGif from '../public/assets/loader.gif';
// import './style/home.css';

// const EXAMPLE_MAIN_URL = window.location.origin;
// console.log(EXAMPLE_MAIN_URL, 'birju');

// export const Home = () => {
//   const [pageLoading, setPageLoading] = useState(false);
//   const [productList, setProductList] = useState([]);
//   const [categoryList, setCategoryList] = useState([]);
//   const [productFilterList, setProductFilterList] = useState([]);

//   const DOC_URL_PATH = '/help/docs/sdk/latest/platform/company/catalog/#getProducts';
//   const DOC_APP_URL_PATH = '/help/docs/sdk/latest/platform/application/catalog#getAppProducts';
//   const { application_id, company_id, query } = useParams();
//   const documentationUrl = 'https://api.fynd.com';

//   useEffect(() => {
//     isApplicationLaunch() ? fetchProducts() : fetchApplicationProducts();
//     isApplicationLaunch() ? fetchApplicationProductsBaseOnFilter() :  fetchProducts();

//     fetchCategory();
//   }, [application_id]);

//   const fetchProducts = async () => {
//     setPageLoading(true);
//     try {
//       const { data } = await axios.get(urlJoin(EXAMPLE_MAIN_URL, '/api/products'), {
//         headers: {
//           'x-company-id': company_id,
//         },
//       });
//       console.log(company_id, 'company_id');
//       setProductList(data.items);
//     } catch (e) {
//       console.error('Error fetching products:', e);
//     } finally {
//       setPageLoading(false);
//     }
//   };

//   const fetchCategory = async () => {
//     setPageLoading(true);
//     try {
//       const { data } = await axios.get(urlJoin(EXAMPLE_MAIN_URL, '/api/products/categories'), {
//         headers: {
//           'x-company-id': company_id,
//         },
//       });
//       console.log(data.data);
//       setCategoryList(data.data);
//       // setProductList(data.items);
//     } catch (e) {
//       console.error('Error fetching products:', e);
//     } finally {
//       setPageLoading(false);
//     }
//   };

//   const fetchApplicationProducts = async () => {
//     setPageLoading(true);
//     console.log(application_id, 'application_id');
//     try {
//       const { data } = await axios.get(
//         urlJoin(EXAMPLE_MAIN_URL, `/api/products/application/672ddc7346bed2c768faf043`),
//         {
//           headers: {
//             'x-company-id': company_id,
//           },
//         }
//       );
//       console.log(company_id);
//       setProductList(data.items);
//     } catch (e) {
//       console.error('Error fetching application products:', e);
//     } finally {
//       setPageLoading(false);
//     }
//   };

//   const fetchApplicationProductsBaseOnFilter = async () => {
//     setPageLoading(true);
//     console.log(application_id, 'application_id');
//     try {
//       const { data } = await axios.get(
//         urlJoin(EXAMPLE_MAIN_URL, `/api/products/applications/672ddc7346bed2c768faf043`),
//         {
//           headers: {
//             'x-company-id': company_id,
//           },
//           params: { query: 'give me shoes black color' },
//         }
//       );
//       console.log(company_id);
//       setProductFilterList(data.items);
//     } catch (e) {
//       console.error('Error fetching application products:', e);
//     } finally {
//       setPageLoading(false);
//     }
//   };

//   const productProfileImage = (media) => {
//     if (!media || !media.length) {
//       return DEFAULT_NO_IMAGE;
//     }
//     const profileImg = media.find((m) => m.type === 'image');
//     return profileImg?.url || DEFAULT_NO_IMAGE;
//   };

//   const getDocumentPageLink = () => {
//     return documentationUrl.replace('api', 'partners').concat(isApplicationLaunch() ? DOC_APP_URL_PATH : DOC_URL_PATH);
//   };

//   const isApplicationLaunch = () => !!application_id;

//   return (
//     <>
//       {pageLoading ? (
//         <div className="loader" data-testid="loader">
//           <img src={loaderGif} alt="loader GIF" />
//         </div>
//       ) : (
//         <div className="products-container">
//           <div className="title">This is an example extension home page user interface.</div>

//           <div className="section">
//             <div className="heading">
//               <span>Example {isApplicationLaunch() ? 'Application API' : 'Platform API'}</span> :
//               <a href={getDocumentPageLink()} target="_blank" rel="noopener noreferrer">
//                 {isApplicationLaunch() ? 'getAppProducts' : 'getProducts'}
//               </a>
//             </div>
//             <div className="description">
//               This is an illustrative Platform API call to fetch the list of products in this company. Check your
//               extension folder’s 'server.js' file to know how to call Platform API and start calling API you require.
//             </div>
//           </div>

//           <div>
//             {productList.map((product, index) => {
//               // Extract price details safely
//               const price = product.price;
//               const effectivePrice = price?.effective?.min || price?.effective?.max || 'N/A';
//               const currency = price?.effective?.currency_symbol || price?.effective?.currency_code || '';

//               return (
//                 <div className="product-list-container flex-row" key={`product-${product.name}-${index}`}>
//                   <img className="mr-r-12" src={product.is_active ? grayDot : greenDot} alt="status" />
//                   <div className="card-avatar mr-r-12">
//                     <img src={productProfileImage(product.media)} alt={product.name} />
//                   </div>
//                   <div className="flex-column">
//                     <div className="flex-row">
//                       <div className="product-name" data-testid={`product-name-${product.id}`}>
//                         {product.name}
//                       </div>
//                       <div className="product-item-code">|</div>
//                       {product.item_code && (
//                         <span className="product-item-code">
//                           Item Code:
//                           <span className="cl-RoyalBlue" data-testid={`product-item-code-${product.id}`}>
//                             {product.item_code}
//                           </span>
//                         </span>
//                       )}
//                     </div>

//                     {/* Brand */}
//                     {product.brand && (
//                       <div className="product-brand-name" data-testid={`product-brand-name-${product.id}`}>
//                         Brand: {product.brand.name}
//                       </div>
//                     )}

//                     {/* Category */}
//                     {product.category_slug && (
//                       <div className="product-category" data-testid={`product-category-slug-${product.id}`}>
//                         Category: <span>{product.category_slug}</span>
//                       </div>
//                     )}

//                     {/* Color */}
//                     {product.color && (
//                       <div className="product-category" data-testid={`product-color-${product.id}`}>
//                         Color: <span>{product.color}</span>
//                       </div>
//                     )}

//                     {/* Price */}
//                     <div className="product-category" data-testid={`product-price-${product.id}`}>
//                       Price:{' '}
//                       <span>
//                         {currency} {effectivePrice}
//                       </span>
//                     </div>
//                   </div>
//                 </div>
//               );
//             })}
//           </div>

//           <div className="section">
//             <div className="heading">
//               <span>Example Category API</span>
//             </div>
//           </div>
//           <div>
//             {categoryList.map((c, index) => (
//               <div className="product-list-container flex-row" key={`product-${c.name}-${index}`}>
//                 <div className="flex-column">
//                   <div className="flex-row">
//                     <div className="product-name" data-testid={`product-name-${c.id}`}>
//                       {c.department}
//                     </div>
//                   </div>
//                   <div className="flex-row">
//                     <div className="product-name" data-testid={`product-name-${c.id}`}>
//                       {c.items.map((item) => {
//                         return (
//                           <>
//                             <div className="card-avatar mr-r-12">
//                               <img src={item.banners.portrait.url} alt={item.name} />
//                             </div>
//                             <span key={`item-${item.name}`}>{item.name}</span>
//                           </>
//                         );
//                       })}
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             ))}
//           </div>
//           {/* Product List */}
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             {productFilterList.map((product, index) => (
//               <div key={index} className="border p-4 rounded-md shadow">
//                 <h3 className="font-bold text-lg">------{product.name}------</h3>
//                 <p>
//                   <strong>Brand:</strong> {product.brand?.name || 'N/A'}
//                 </p>
//                 <p>
//                   <strong>Category:</strong> {product.category_slug || 'N/A'}
//                 </p>
//                 <p>
//                   <strong>Color:</strong> {product.color || 'N/A'}
//                 </p>
//                 <p>
//                   <strong>Price:</strong>{' '}
//                   {product.price?.effective?.min
//                     ? `${product.price.effective.currency_symbol || '₹'}${product.price.effective.min}`
//                     : 'N/A'}
//                 </p>
//               </div>
//             ))}
//           </div>
//         </div>
//       )}
//     </>
//   );
// };
