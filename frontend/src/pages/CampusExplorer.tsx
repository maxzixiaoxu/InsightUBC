import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Room } from '@/types/room';
import { CampusAPI } from '@/lib/api';
import CampusMap from '@/components/CampusMap';
import RoomSelector from '@/components/RoomSelector';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Loader2, AlertCircle, School } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const CampusExplorer: React.FC = () => {
  const [selectedRooms, setSelectedRooms] = useState<Room[]>([]);
  const { toast } = useToast();

  const { data: rooms = [], isLoading, error, refetch } = useQuery({
    queryKey: ['rooms'],
    queryFn: CampusAPI.queryRooms,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleRoomSelect = (room: Room) => {
    if (selectedRooms.length >= 5) {
      toast({
        title: "Selection Limit Reached",
        description: "You can select up to 5 rooms at a time.",
        variant: "destructive"
      });
      return;
    }

    setSelectedRooms(prev => [...prev, room]);
    toast({
      title: "Room Selected",
      description: `${room.shortname} ${room.number} has been added to your selection.`,
    });
  };

  const handleRoomDeselect = (room: Room) => {
    setSelectedRooms(prev => prev.filter(r => r.name !== room.name));
    toast({
      title: "Room Deselected",
      description: `${room.shortname} ${room.number} has been removed from your selection.`,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-campus-blue mx-auto" />
          <div>
            <h3 className="text-lg font-semibold text-campus-navy">Loading Campus Data</h3>
            <p className="text-muted-foreground">Fetching room information...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-6 max-w-md">
          <div className="space-y-3">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
            <h3 className="text-xl font-semibold text-campus-navy">Unable to Load Campus Data</h3>
            <p className="text-muted-foreground">
              Please ensure your backend server is running and the dataset is uploaded.
            </p>
          </div>
          
          <div className="space-y-3">
            <Button onClick={() => refetch()} className="w-full">
              Retry Loading
            </Button>
            
            <div className="p-4 bg-campus-light rounded-lg text-left">
              <h4 className="font-medium text-campus-navy mb-2">Expected Backend:</h4>
              <p className="text-sm text-muted-foreground mb-2">
                {import.meta.env.VITE_BACKEND_URL || "http://localhost:4321"}
              </p>
              <p className="text-xs text-muted-foreground">
                Make sure the C2 rooms dataset is uploaded via PUT /dataset/rooms/rooms
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-campus-blue to-campus-green rounded-lg">
                <School className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-campus-navy">Campus Explorer</h1>
                <p className="text-sm text-muted-foreground">
                  Explore campus buildings and rooms
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span>{rooms.length} rooms available</span>
              <span>•</span>
              <span>{selectedRooms.length}/5 selected</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <ResizablePanelGroup direction="horizontal" className="h-[calc(100vh-73px)]">
        {/* Room Selection Panel */}
        <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
          <div className="h-full p-6 bg-background overflow-hidden">
            <RoomSelector
              rooms={rooms}
              selectedRooms={selectedRooms}
              onRoomSelect={handleRoomSelect}
              onRoomDeselect={handleRoomDeselect}
            />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Map Panel */}
        <ResizablePanel defaultSize={65} minSize={50}>
          <div className="h-full p-6 bg-background">
            <div className="h-full bg-white rounded-lg border shadow-sm overflow-hidden">
              <CampusMap
                rooms={rooms}
                selectedRooms={selectedRooms}
                onRoomSelect={handleRoomSelect}
              />
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default CampusExplorer;