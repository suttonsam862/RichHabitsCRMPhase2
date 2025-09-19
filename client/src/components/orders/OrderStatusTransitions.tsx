import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { OrderStatusBadge } from './OrderStatusBadge';
import { cn } from '@/lib/utils';
import { 
  ArrowRight,
  Play,
  Pause,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Package,
  Truck,
  Factory,
  Palette,
  MessageSquare
} from 'lucide-react';

interface StatusTransition {
  from: string;
  to: string;
  label: string;
  description: string;
  icon: any;
  requiresNote?: boolean;
  businessRules?: string[];
  estimatedDuration?: string;
}

interface WorkflowStep {
  status: string;
  label: string;
  description: string;
  icon: any;
  isCompleted: boolean;
  isCurrent: boolean;
  estimatedDuration?: string;
}

interface OrderStatusTransitionsProps {
  currentStatus: string;
  onStatusChange: (newStatus: string, note?: string) => void;
  isLoading?: boolean;
  className?: string;
}

const STATUS_WORKFLOWS: Record<string, WorkflowStep[]> = {
  draft: [
    { status: 'draft', label: 'Draft', description: 'Order being prepared', icon: MessageSquare, isCompleted: true, isCurrent: true },
    { status: 'pending', label: 'Pending Review', description: 'Awaiting approval', icon: Clock, isCompleted: false, isCurrent: false },
    { status: 'confirmed', label: 'Confirmed', description: 'Order approved', icon: CheckCircle2, isCompleted: false, isCurrent: false },
    { status: 'design', label: 'Design Phase', description: 'Creating designs', icon: Palette, isCompleted: false, isCurrent: false },
    { status: 'manufacturing', label: 'Manufacturing', description: 'Production in progress', icon: Factory, isCompleted: false, isCurrent: false },
    { status: 'fulfillment', label: 'Fulfillment', description: 'Preparing for shipment', icon: Package, isCompleted: false, isCurrent: false },
    { status: 'shipped', label: 'Shipped', description: 'In transit', icon: Truck, isCompleted: false, isCurrent: false },
    { status: 'delivered', label: 'Delivered', description: 'Successfully delivered', icon: CheckCircle2, isCompleted: false, isCurrent: false },
  ],
  pending: [
    { status: 'draft', label: 'Draft', description: 'Order being prepared', icon: MessageSquare, isCompleted: true, isCurrent: false },
    { status: 'pending', label: 'Pending Review', description: 'Awaiting approval', icon: Clock, isCompleted: true, isCurrent: true },
    { status: 'confirmed', label: 'Confirmed', description: 'Order approved', icon: CheckCircle2, isCompleted: false, isCurrent: false },
    { status: 'design', label: 'Design Phase', description: 'Creating designs', icon: Palette, isCompleted: false, isCurrent: false },
    { status: 'manufacturing', label: 'Manufacturing', description: 'Production in progress', icon: Factory, isCompleted: false, isCurrent: false },
    { status: 'fulfillment', label: 'Fulfillment', description: 'Preparing for shipment', icon: Package, isCompleted: false, isCurrent: false },
    { status: 'shipped', label: 'Shipped', description: 'In transit', icon: Truck, isCompleted: false, isCurrent: false },
    { status: 'delivered', label: 'Delivered', description: 'Successfully delivered', icon: CheckCircle2, isCompleted: false, isCurrent: false },
  ],
  // Add more workflow mappings as needed
};

const AVAILABLE_TRANSITIONS: Record<string, StatusTransition[]> = {
  draft: [
    {
      from: 'draft',
      to: 'pending',
      label: 'Submit for Review',
      description: 'Submit order for approval and review',
      icon: Play,
      requiresNote: false,
      businessRules: ['All items must have quantities > 0', 'Customer information must be complete'],
      estimatedDuration: '1-2 days'
    },
    {
      from: 'draft',
      to: 'confirmed',
      label: 'Approve Directly',
      description: 'Skip review and approve order directly',
      icon: CheckCircle2,
      requiresNote: true,
      businessRules: ['Must have admin permissions', 'Order total under approval threshold'],
      estimatedDuration: 'Immediate'
    },
  ],
  pending: [
    {
      from: 'pending',
      to: 'confirmed',
      label: 'Approve Order',
      description: 'Approve order and move to design phase',
      icon: CheckCircle2,
      requiresNote: false,
      estimatedDuration: '2-3 days'
    },
    {
      from: 'pending',
      to: 'draft',
      label: 'Return to Draft',
      description: 'Send back for modifications',
      icon: ArrowRight,
      requiresNote: true,
      businessRules: ['Must provide reason for rejection'],
      estimatedDuration: 'Varies'
    },
    {
      from: 'pending',
      to: 'on_hold',
      label: 'Put on Hold',
      description: 'Temporarily pause order processing',
      icon: Pause,
      requiresNote: true,
      estimatedDuration: 'Indefinite'
    },
  ],
  confirmed: [
    {
      from: 'confirmed',
      to: 'design',
      label: 'Start Design',
      description: 'Begin design phase for custom items',
      icon: Palette,
      requiresNote: false,
      businessRules: ['Designer must be assigned', 'Design brief must be complete'],
      estimatedDuration: '3-5 days'
    },
    {
      from: 'confirmed',
      to: 'manufacturing',
      label: 'Skip to Manufacturing',
      description: 'Skip design for standard items',
      icon: Factory,
      requiresNote: false,
      businessRules: ['All items must be standard catalog items'],
      estimatedDuration: '5-10 days'
    },
  ],
  design: [
    {
      from: 'design',
      to: 'manufacturing',
      label: 'Approve Design',
      description: 'Design approved, ready for manufacturing',
      icon: Factory,
      requiresNote: false,
      businessRules: ['Design must be approved by customer', 'All design assets must be uploaded'],
      estimatedDuration: '5-10 days'
    },
    {
      from: 'design',
      to: 'on_hold',
      label: 'Put on Hold',
      description: 'Pause for design revisions',
      icon: Pause,
      requiresNote: true,
      estimatedDuration: 'Indefinite'
    },
  ],
  manufacturing: [
    {
      from: 'manufacturing',
      to: 'fulfillment',
      label: 'Complete Manufacturing',
      description: 'Manufacturing complete, ready for fulfillment',
      icon: Package,
      requiresNote: false,
      businessRules: ['Quality control must be passed', 'All items must be manufactured'],
      estimatedDuration: '1-2 days'
    },
    {
      from: 'manufacturing',
      to: 'on_hold',
      label: 'Manufacturing Issue',
      description: 'Hold due to manufacturing problem',
      icon: AlertTriangle,
      requiresNote: true,
      estimatedDuration: 'Varies'
    },
  ],
  fulfillment: [
    {
      from: 'fulfillment',
      to: 'shipped',
      label: 'Ship Order',
      description: 'Package and ship the order',
      icon: Truck,
      requiresNote: false,
      businessRules: ['Shipping address must be confirmed', 'Payment must be complete'],
      estimatedDuration: '1-3 days'
    },
  ],
  shipped: [
    {
      from: 'shipped',
      to: 'delivered',
      label: 'Confirm Delivery',
      description: 'Mark order as delivered',
      icon: CheckCircle2,
      requiresNote: false,
      estimatedDuration: 'Variable'
    },
  ],
};

export function OrderStatusTransitions({
  currentStatus,
  onStatusChange,
  isLoading = false,
  className
}: OrderStatusTransitionsProps) {
  const [selectedTransition, setSelectedTransition] = useState<StatusTransition | null>(null);
  const [transitionNote, setTransitionNote] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const availableTransitions = AVAILABLE_TRANSITIONS[currentStatus] || [];
  const workflowSteps = STATUS_WORKFLOWS[currentStatus] || STATUS_WORKFLOWS.draft;

  const getProgressPercentage = () => {
    const currentIndex = workflowSteps.findIndex(step => step.status === currentStatus);
    return ((currentIndex + 1) / workflowSteps.length) * 100;
  };

  const handleTransitionClick = (transition: StatusTransition) => {
    setSelectedTransition(transition);
    setTransitionNote('');
    setShowConfirmDialog(true);
  };

  const handleConfirmTransition = () => {
    if (selectedTransition) {
      const note = selectedTransition.requiresNote && transitionNote ? transitionNote : undefined;
      onStatusChange(selectedTransition.to, note);
      setShowConfirmDialog(false);
      setSelectedTransition(null);
      setTransitionNote('');
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Status & Workflow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Status & Workflow
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Status */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Current Status
              </span>
              <OrderStatusBadge status={currentStatus} size="lg" />
            </div>
            <Progress value={getProgressPercentage()} className="h-2" />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Order Progress</span>
              <span>{Math.round(getProgressPercentage())}%</span>
            </div>
          </div>

          {/* Workflow Steps */}
          <div>
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
              Workflow Progress
            </h4>
            <div className="space-y-3">
              {workflowSteps.map((step, index) => {
                const Icon = step.icon;
                const isLast = index === workflowSteps.length - 1;
                
                return (
                  <div key={step.status} className="relative flex items-center gap-3">
                    {/* Connector line */}
                    {!isLast && (
                      <div className={cn(
                        'absolute left-4 top-8 h-6 w-px',
                        step.isCompleted ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                      )} />
                    )}
                    
                    {/* Step icon */}
                    <div className={cn(
                      'relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2',
                      step.isCompleted 
                        ? 'bg-green-500 border-green-500 text-white'
                        : step.isCurrent
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'bg-gray-100 border-gray-200 text-gray-400 dark:bg-gray-800 dark:border-gray-700'
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    
                    {/* Step content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'font-medium text-sm',
                          step.isCurrent ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'
                        )}>
                          {step.label}
                        </span>
                        {step.isCurrent && (
                          <Badge variant="outline" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Available Actions */}
          {availableTransitions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
                Available Actions
              </h4>
              <div className="space-y-2">
                {availableTransitions.map((transition) => {
                  const Icon = transition.icon;
                  return (
                    <Button
                      key={`${transition.from}-${transition.to}`}
                      variant="outline"
                      className="w-full justify-start h-auto p-4"
                      onClick={() => handleTransitionClick(transition)}
                      data-testid={`button-transition-${transition.to}`}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <Icon className="h-5 w-5 text-gray-400" />
                        <div className="flex-1 text-left">
                          <div className="font-medium">{transition.label}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {transition.description}
                          </div>
                          {transition.estimatedDuration && (
                            <div className="text-xs text-blue-600 mt-1">
                              Est. duration: {transition.estimatedDuration}
                            </div>
                          )}
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transition Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Status Change</DialogTitle>
          </DialogHeader>
          
          {selectedTransition && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <OrderStatusBadge status={selectedTransition.from} />
                <ArrowRight className="h-4 w-4 text-gray-400" />
                <OrderStatusBadge status={selectedTransition.to} />
              </div>
              
              <div>
                <h4 className="font-medium mb-2">{selectedTransition.label}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {selectedTransition.description}
                </p>
                
                {selectedTransition.businessRules && selectedTransition.businessRules.length > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-3">
                    <h5 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
                      Requirements:
                    </h5>
                    <ul className="text-xs text-blue-800 dark:text-blue-400 space-y-1">
                      {selectedTransition.businessRules.map((rule, index) => (
                        <li key={index} className="flex items-start gap-1">
                          <span>•</span>
                          <span>{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {selectedTransition.requiresNote && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Note {selectedTransition.requiresNote ? '(Required)' : '(Optional)'}
                    </label>
                    <Textarea
                      value={transitionNote}
                      onChange={(e) => setTransitionNote(e.target.value)}
                      placeholder="Add a note about this status change..."
                      className="min-h-20"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmTransition}
              disabled={selectedTransition?.requiresNote && !transitionNote.trim()}
            >
              Confirm Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}