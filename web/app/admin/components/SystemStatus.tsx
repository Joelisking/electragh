import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';

export function SystemStatus() {
  return (
    <Card className="bg-gradient-to-br from-white to-gray-50/50 shadow-lg border-gray-200/70 hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="bg-gradient-to-r from-electra-primary/5 to-electra-secondary/5 border-b border-gray-100">
        <CardTitle className="text-lg font-semibold text-gray-800">System Status</CardTitle>
        <CardDescription className="text-gray-600">Current system health and alerts</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-electra-primary-light/50 p-2 rounded-lg">
                <CheckCircle className="w-4 h-4 text-electra-primary" />
              </div>
              <span className="text-sm font-medium text-gray-700">Election System</span>
            </div>
            <Badge variant="secondary" className="bg-electra-primary-light text-electra-primary border-electra-primary/30 shadow-sm">
              Operational
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
