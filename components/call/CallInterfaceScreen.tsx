import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import CallInterface from './CallInterface';

export default function CallInterfaceScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { callId } = route.params || {};
  const [call, setCall] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!callId) {
      setError('No callId provided');
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.from('calls').select('*').eq('id', callId).single();
      if (error) setError(error.message);
      setCall(data);
      setLoading(false);
    })();
  }, [callId]);

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}><ActivityIndicator size="large" color="#00bfae" /></View>;
  if (error || !call) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}><Text style={{ color: '#f00' }}>{error || 'Call not found'}</Text></View>;

  return (
    <CallInterface visible={true} call={call} onClose={() => navigation.goBack()} />
  );
} 