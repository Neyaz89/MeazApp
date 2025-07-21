import { supabase } from '../../lib/supabase';
import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';

class CallService {
  constructor() {
    this.currentCall = null;
    this.callListeners = new Map();
    this.setupRealtimeListeners();
  }

  async setupRealtimeListeners() {
    // Listen for incoming calls in real-time
    supabase
      .channel('calls')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'calls'
      }, (payload) => {
        this.handleIncomingCall(payload.new);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'calls'
      }, (payload) => {
        this.handleCallUpdate(payload.new);
      })
      .subscribe();
  }

  async handleIncomingCall(callData) {
    const { data: { user } } = await supabase.auth.getUser();

    // Only handle if this call is for the current user
    if (callData.receiver_id === user?.id && callData.status === 'ringing') {
      // Show incoming call notification
      await this.showIncomingCallNotification(callData);

      // Notify all registered listeners
      this.callListeners.forEach(callback => {
        callback('incoming_call', callData);
      });
    }
  }

  async handleCallUpdate(callData) {
    if (this.currentCall?.id === callData.id) {
      this.callListeners.forEach(callback => {
        callback('call_update', callData);
      });
    }
  }

  async showIncomingCallNotification(callData) {
    // Get caller info
    const { data: caller } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', callData.caller_id)
      .single();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${callData.call_type === 'video' ? 'Video' : 'Audio'} Call`,
        body: `Incoming call from ${caller?.username || 'Unknown'}`,
        data: { callData, caller },
        categoryIdentifier: 'call',
      },
      trigger: null,
    });
  }

  async initiateCall(receiverId, callType = 'audio') {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: call, error } = await supabase
        .from('calls')
        .insert({
          caller_id: user.id,
          receiver_id: receiverId,
          call_type: callType,
          status: 'ringing',
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      this.currentCall = call;
      return call;
    } catch (error) {
      console.error('Error initiating call:', error);
      throw error;
    }
  }

  async acceptCall(callId) {
    try {
      const { data, error } = await supabase
        .from('calls')
        .update({ 
          status: 'active',
          answered_at: new Date().toISOString()
        })
        .eq('id', callId)
        .select()
        .single();

      if (error) throw error;

      this.currentCall = data;
      return data;
    } catch (error) {
      console.error('Error accepting call:', error);
      throw error;
    }
  }

  async rejectCall(callId) {
    try {
      const { error } = await supabase
        .from('calls')
        .update({ 
          status: 'rejected',
          ended_at: new Date().toISOString()
        })
        .eq('id', callId);

      if (error) throw error;

      this.currentCall = null;
    } catch (error) {
      console.error('Error rejecting call:', error);
      throw error;
    }
  }

  async endCall(callId) {
    try {
      const { error } = await supabase
        .from('calls')
        .update({ 
          status: 'ended',
          ended_at: new Date().toISOString()
        })
        .eq('id', callId);

      if (error) throw error;

      this.currentCall = null;
    } catch (error) {
      console.error('Error ending call:', error);
      throw error;
    }
  }

  onCallEvent(callback) {
    const id = Math.random().toString(36);
    this.callListeners.set(id, callback);

    return () => {
      this.callListeners.delete(id);
    };
  }

  getCurrentCall() {
    return this.currentCall;
  }
}

export default new CallService();