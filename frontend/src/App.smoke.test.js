import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.IS_REACT_ACT_ENVIRONMENT = true;
let mockUser = false;
jest.mock('@/lib/api', () => ({
  BACKEND_URL: '', API: '/api', mediaUrl: (u) => u || '', apiError: (e) => String(e || 'error'),
  api: { get: jest.fn(async (url) => {
    if(url === '/auth/me') { if(mockUser) return {data:mockUser}; throw new Error('guest'); }
    if(url === '/public/settings') return {data:{platform_name:'منصتي',colors:{primary:'#071D32',accent:'#2563EB'}}};
    if(url === '/account/overview') return {data:{plan:null,orders:[],payment:{enabled:false},sites_count:0}};
    if(url === '/commerce/account') return {data:{configured:false,status:null}};
    if(url === '/payouts') return {data:{configured:false,payouts:[]}};
    return {data:[]};
  }), post:jest.fn(), put:jest.fn() },
}));
const App = require('./App').default;
const apiGet = require('@/lib/api').api.get;
const originalGet = apiGet.getMockImplementation();
let root, container;
beforeEach(() => {
  apiGet.mockImplementation(originalGet);
  window.scrollTo=jest.fn();
  window.matchMedia=jest.fn().mockImplementation(() => ({matches:false,addListener:jest.fn(),removeListener:jest.fn(),addEventListener:jest.fn(),removeEventListener:jest.fn()}));
  global.IntersectionObserver=class {observe(){} unobserve(){} disconnect(){}};
  container=document.createElement('div');document.body.append(container);root=createRoot(container);
});
afterEach(async () => {await act(async()=>root.unmount());container.remove();});
test.each([
  ['/',false,'home-page'],['/login',false,'login-form'],['/register',false,'register-form'],
  ['/dashboard',true,'sites-page'],['/dashboard/billing',true,'billing-page'],
  ['/dashboard/payments',true,'merchant-payments-page'],['/dashboard/payouts',true,'payouts-page'],
  ['/dashboard/domains',true,'domains-page'],
])('loads %s with its real layout', async (path,signedIn,testId) => {
  mockUser=signedIn ? {id:'owner',name:'اختبار',role:'customer'} : false;
  window.history.replaceState({},'',path);
  await act(async()=>{root.render(<App/>);});
  expect(container.querySelector(`[data-testid="${testId}"]`)).not.toBeNull();
});


test('billing recovers after an API failure without leaving a loading spinner', async () => {
  mockUser = {id:'owner',name:'اختبار',role:'customer'};
  let failed = false;
  apiGet.mockImplementation(async (url) => {
    if (url === '/account/overview' && !failed) {
      failed = true;
      throw {response:{data:{detail:'تعذر تحميل الاشتراك'}}};
    }
    return originalGet(url);
  });
  window.history.replaceState({}, '', '/dashboard/billing');
  await act(async () => { root.render(<App/>); });
  expect(container.querySelector('[data-testid="billing-error"]')).not.toBeNull();
  expect(container.querySelector('[data-testid="billing-loading"]')).toBeNull();
  await act(async () => { container.querySelector('[data-testid="billing-retry"]').click(); });
  expect(container.querySelector('[data-testid="billing-page"]')).not.toBeNull();
  expect(container.querySelector('[data-testid="billing-error"]')).toBeNull();
});
