import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Overview from './components/dashboard/Overview';

function App() {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title="Overview"
          subtitle="Monitor your LocalStripe mock server activity and data"
        />
        <main className="flex-1 overflow-y-auto">
          <Overview />
        </main>
      </div>
    </div>
  );
}

export default App;
