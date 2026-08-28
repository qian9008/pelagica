import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { LayerStackProvider, LayerStackView } from '@/router';
import { Toaster } from './components/ui/toast';

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <Toaster />
            <LayerStackProvider>
                <LayerStackView />
            </LayerStackProvider>
        </QueryClientProvider>
    );
}

export default App;
