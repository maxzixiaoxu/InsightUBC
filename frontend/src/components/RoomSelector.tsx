import React, { useState } from 'react';
import { Room } from '@/types/room';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, X, Building2 } from 'lucide-react';
import RoomCard from './RoomCard';
import { calculateWalkingTime } from '@/lib/api';

interface RoomSelectorProps {
  rooms: Room[];
  selectedRooms: Room[];
  onRoomSelect: (room: Room) => void;
  onRoomDeselect: (room: Room) => void;
}

const RoomSelector: React.FC<RoomSelectorProps> = ({
  rooms,
  selectedRooms,
  onRoomSelect,
  onRoomDeselect
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRooms = rooms.filter(room =>
    room.fullname.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.shortname.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleRoom = (room: Room) => {
    const isSelected = selectedRooms.some(selected => selected.name === room.name);
    if (isSelected) {
      onRoomDeselect(room);
    } else if (selectedRooms.length < 5) {
      onRoomSelect(room);
    }
  };

  const clearSelection = () => {
    selectedRooms.forEach(room => onRoomDeselect(room));
  };

  // Calculate walking times for each selected room
  const getWalkingTimesForRoom = (targetRoom: Room) => {
    return selectedRooms
      .filter(room => room.name !== targetRoom.name)
      .map(room => ({
        roomName: `${room.shortname} ${room.number}`,
        time: calculateWalkingTime(targetRoom, room)
      }));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Building2 className="h-5 w-5 text-campus-blue" />
          <h2 className="text-xl font-semibold text-campus-navy">Room Selection</h2>
        </div>
        <Badge variant="outline" className="text-campus-blue border-campus-blue">
          {selectedRooms.length}/5 selected
        </Badge>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by building, room number, or address..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Selected Rooms */}
      {selectedRooms.length > 0 && (
        <div className="space-y-3 max-h-60 overflow-y-auto">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-campus-navy">Selected Rooms</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          </div>
          
          <div className="grid gap-3">
            {selectedRooms.map(room => (
              <RoomCard
                key={room.name}
                room={room}
                isSelected={true}
                onToggleSelect={handleToggleRoom}
                walkingTimes={getWalkingTimesForRoom(room)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Available Rooms */}
      <div className="space-y-3">
        <h3 className="font-medium text-campus-navy">
          Available Rooms ({filteredRooms.length})
        </h3>
        
        <ScrollArea className="h-[400px]">
          <div className="grid gap-3 pr-4">
            {filteredRooms.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No rooms found matching your search.</p>
              </div>
            ) : (
              filteredRooms.map(room => (
                <RoomCard
                  key={room.name}
                  room={room}
                  isSelected={selectedRooms.some(selected => selected.name === room.name)}
                  onToggleSelect={handleToggleRoom}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {selectedRooms.length >= 5 && (
        <div className="p-3 bg-campus-light rounded-lg border border-campus-blue/20">
          <p className="text-sm text-campus-navy">
            Maximum of 5 rooms can be selected. Deselect a room to choose another.
          </p>
        </div>
      )}
    </div>
  );
};

export default RoomSelector;