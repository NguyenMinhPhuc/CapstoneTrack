
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Play, Pause, RefreshCw, Timer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from './ui/label';

export function Stopwatch() {
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60);
  const [isActive, setIsActive] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(intervalRef.current!);
            setIsActive(false);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive]);

  const handleStartPause = () => {
    setIsActive(!isActive);
  };

  const handleReset = () => {
    setIsActive(false);
    setTimeLeft(durationMinutes * 60);
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const minutes = parseInt(e.target.value, 10);
    if (!isNaN(minutes) && minutes > 0) {
      setDurationMinutes(minutes);
      if (!isActive) {
        setTimeLeft(minutes * 60);
      }
    } else if (e.target.value === '') {
       setDurationMinutes(0);
       if (!isActive) {
        setTimeLeft(0);
      }
    }
  };

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Timer className="h-4 w-4"/>
            Đồng hồ báo cáo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-4xl font-bold text-center font-mono py-2 bg-muted rounded-md">
          {formatTime(timeLeft)}
        </div>
        <div className="flex items-center gap-2">
            <div className="flex-1 space-y-1">
                <Label htmlFor="duration" className="text-xs">Thời gian (phút)</Label>
                <Input
                    id="duration"
                    type="number"
                    value={durationMinutes}
                    onChange={handleDurationChange}
                    disabled={isActive}
                    className="h-9"
                />
            </div>
            <div className="flex items-end gap-2 h-full pt-5">
                <Button onClick={handleStartPause} size="icon" className="h-9 w-9">
                    {isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button onClick={handleReset} variant="outline" size="icon" className="h-9 w-9">
                    <RefreshCw className="h-4 w-4" />
                </Button>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
