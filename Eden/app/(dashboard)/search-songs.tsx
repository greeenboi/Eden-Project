import { View } from '@/components/Themed';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { router } from 'expo-router';
import { ArrowLeft, Search } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

export default function SearchSongsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'title' | 'artist' | 'album'>('all');
  const [genre, setGenre] = useState('');
  const [year, setYear] = useState('');

  const handleSearch = () => {
    // Implement search logic
    console.log({ searchQuery, searchType, genre, year });
  };

  return (
    <View style={styles.container}>
      <View style={{backgroundColor:"transparent"}} className="flex-row items-center gap-3 p-4">
        <Button variant="ghost" size="sm" onPress={() => router.back()}>
          <ArrowLeft size={24} />
        </Button>
        <Text className="text-2xl font-bold">Search Songs</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Advanced Search</CardTitle>
            <CardDescription>Find songs with detailed filters</CardDescription>
          </CardHeader>
          <CardContent className="gap-4">
            {/* Search Query */}
            <View style={{backgroundColor:"transparent"}} className="gap-2">
              <Label nativeID="search">Search Query</Label>
              <Input
                placeholder="Enter song, artist, or album..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                aria-labelledby="search"
              />
            </View>

            <Separator />

            {/* Search Type */}
            <View style={{backgroundColor:"transparent"}} className="gap-2">
              <Label>Search In</Label>
              <RadioGroup value={searchType} onValueChange={(val) => setSearchType(val as typeof searchType)}>
                <View style={{backgroundColor:"transparent"}} className="flex-row items-center gap-2 mb-2">
                  <RadioGroupItem value="all" aria-labelledby="all" />
                  <Label nativeID="all">All Fields</Label>
                </View>
                <View style={{backgroundColor:"transparent"}} className="flex-row items-center gap-2 mb-2">
                  <RadioGroupItem value="title" aria-labelledby="title" />
                  <Label nativeID="title">Song Title Only</Label>
                </View>
                <View style={{backgroundColor:"transparent"}} className="flex-row items-center gap-2 mb-2">
                  <RadioGroupItem value="artist" aria-labelledby="artist" />
                  <Label nativeID="artist">Artist Only</Label>
                </View>
                <View style={{backgroundColor:"transparent"}} className="flex-row items-center gap-2">
                  <RadioGroupItem value="album" aria-labelledby="album" />
                  <Label nativeID="album">Album Only</Label>
                </View>
              </RadioGroup>
            </View>

            <Separator />

            {/* Additional Filters */}
            <View style={{backgroundColor:"transparent"}} className="gap-2">
              <Label nativeID="genre">Genre</Label>
              <Input
                placeholder="e.g., Rock, Pop, Jazz"
                value={genre}
                onChangeText={setGenre}
                aria-labelledby="genre"
              />
            </View>

            <View style={{backgroundColor:"transparent"}} className="gap-2">
              <Label nativeID="year">Year</Label>
              <Input
                placeholder="e.g., 2020"
                value={year}
                onChangeText={setYear}
                aria-labelledby="year"
                keyboardType="numeric"
              />
            </View>
          </CardContent>
        </Card>

        <Button onPress={handleSearch} className="w-full">
          <Search size={20} />
          <Text className="ml-2">Search</Text>
        </Button>
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
  },
});
