import { View } from '@/components/Themed';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { router } from 'expo-router';
import { Music, Play, Search, Settings, User } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

// Mock data - replace with actual API call
const mockSongs = [
  { id: '1', title: 'Bohemian Rhapsody', artist: 'Queen', duration: '5:55' },
  { id: '2', title: 'Stairway to Heaven', artist: 'Led Zeppelin', duration: '8:02' },
  { id: '3', title: 'Hotel California', artist: 'Eagles', duration: '6:30' },
  { id: '4', title: 'Imagine', artist: 'John Lennon', duration: '3:03' },
  { id: '5', title: 'Smells Like Teen Spirit', artist: 'Nirvana', duration: '5:01' },
  { id: '6', title: 'Sweet Child O\' Mine', artist: 'Guns N\' Roses', duration: '5:56' },
  { id: '7', title: 'Billie Jean', artist: 'Michael Jackson', duration: '4:54' },
  { id: '8', title: 'Hey Jude', artist: 'The Beatles', duration: '7:11' },
];

export default function AllSongsScreen() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSongs = mockSongs.filter(song =>
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSongPress = (songId: string) => {
    router.push(`/playing-song?id=${songId}`);
  };

  return (
    <View style={styles.container}>
      {/* Header with Navigation */}
      <View style={{backgroundColor:"transparent"}} className="flex-row items-center justify-between p-4 pb-2">
        <View style={{backgroundColor:"transparent"}} className="flex-row items-center gap-3">
          <Music size={32} className="text-primary" />
          <Text className="text-3xl font-bold">All Songs</Text>
        </View>
        <View style={{backgroundColor:"transparent"}} className="flex-row gap-2">
          <Pressable onPress={() => router.push('/account')}>
            <Avatar alt="User" className="w-10 h-10">
              <AvatarFallback>
                <User size={20} />
              </AvatarFallback>
            </Avatar>
          </Pressable>
          <Pressable onPress={() => router.push('/settings')}>
            <View style={{backgroundColor:"transparent"}} className="w-10 h-10 items-center justify-center">
              <Settings size={24} />
            </View>
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Quick Search Bar */}
        <Card className="mb-4">
          <CardContent className="pt-4">
            <View style={{backgroundColor:"transparent"}} className="flex-row items-center gap-2">
              <Search size={20} className="opacity-50" />
              <Input
                placeholder="Search songs or artists..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="sm"
                onPress={() => router.push('/search-songs')}>
                <Text>Advanced</Text>
              </Button>
            </View>
          </CardContent>
        </Card>

        {/* Song List */}
        <View style={{backgroundColor:"transparent"}} className="gap-2">
          {filteredSongs.map((song) => (
            <Pressable key={song.id} onPress={() => handleSongPress(song.id)}>
              <Card>
                <CardContent className="py-3">
                  <View style={{backgroundColor:"transparent"}} className="flex-row items-center justify-between">
                    <View style={{backgroundColor:"transparent"}} className="flex-row items-center gap-3 flex-1">
                      <View style={{backgroundColor:"transparent"}} className="w-12 h-12 bg-primary/20 rounded items-center justify-center">
                        <Music size={24} className="text-primary" />
                      </View>
                      <View style={{backgroundColor:"transparent"}} className="flex-1">
                        <Text className="font-semibold text-base">{song.title}</Text>
                        <Text className="text-sm opacity-70">{song.artist}</Text>
                      </View>
                    </View>
                    <View style={{backgroundColor:"transparent"}} className="flex-row items-center gap-3">
                      <Text className="text-sm opacity-50">{song.duration}</Text>
                      <Play size={20} className="text-primary" />
                    </View>
                  </View>
                </CardContent>
              </Card>
            </Pressable>
          ))}
        </View>

        {filteredSongs.length === 0 && (
          <Card className="mt-8">
            <CardContent className="py-8 items-center">
              <Text className="text-center opacity-70">No songs found</Text>
            </CardContent>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingTop: 8,
  },
});
