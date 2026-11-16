import './reading-tracker';
import './reading-dashboard.css';

if (new URLSearchParams(location.search).get('widgetName') === 'reading-dashboard') {
  document.documentElement.classList.add('rt-dashboard-frame');
}
