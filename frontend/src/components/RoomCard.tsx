import React from 'react';
import { Room } from '@/types/room';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Users, Building } from 'lucide-react';

interface RoomCardProps {
  room: Room;
  isSelected: boolean;
  onToggleSelect: (room: Room) => void;
  walkingTimes?: { roomName: string; time: number }[];
}

const RoomCard: React.FC<RoomCardProps> = ({ 
  room, 
  isSelected, 
  onToggleSelect, 
  walkingTimes = [] 
}) => {
  return (
    <Card className={`transition-all duration-200 hover:shadow-lg ${
      isSelected 
        ? 'ring-2 ring-campus-blue shadow-[var(--shadow-campus)]' 
        : 'hover:shadow-md'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg text-campus-navy">{room.fullname}</CardTitle>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Building className="h-4 w-4" />
              <span>{room.shortname} {room.number}</span>
            </div>
          </div>
          <Button
            variant={isSelected ? "default" : "outline"}
            size="sm"
            onClick={() => onToggleSelect(room)}
            className={isSelected ? "bg-campus-blue hover:bg-campus-blue/90" : ""}
          >
            {isSelected ? 'Selected' : 'Select'}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex items-center space-x-2 text-sm">
          <MapPin className="h-4 w-4 text-campus-blue" />
          <span className="text-muted-foreground">{room.address}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-campus-green" />
            <span className="text-sm font-medium">{room.seats} seats</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {room.type}
          </Badge>
        </div>

        {room.furniture && (
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Furniture:</span> {room.furniture}
          </div>
        )}

        {walkingTimes.length > 0 && (
          <div className="pt-2 border-t">
            <h4 className="text-sm font-medium text-campus-navy mb-2">Walking Times</h4>
            <div className="space-y-1">
              {walkingTimes.map(({ roomName, time }) => (
                <div key={roomName} className="flex justify-between text-xs">
                  <span className="text-muted-foreground truncate flex-1 mr-2">
                    {roomName}
                  </span>
                  <span className="font-medium text-campus-blue">
                    {time} min
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RoomCard;