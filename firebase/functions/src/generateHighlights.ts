// 📁 /firebase/functions/src/generateHighlights.ts
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { firestore } from './firebase.js'
import { Timestamp } from 'firebase-admin/firestore'
import { presetScans } from '../../../shared/data/presetScans.js'
import { selectTopHighlights, TriggerWithMeta } from './highlightScans.js'

/**
 * 🔁 Scheduled function to generate daily scan highlights.
 * Stores them under: /market/highlights/daily/{yyyy-mm-dd}
 */
export const generateDailyHighlights = onSchedule('every day 13:45', async () => {
  try {
    const startOfDay = Timestamp.fromDate(new Date(new Date().setHours(0, 0, 0, 0)))

    const triggersSnap = await firestore
      .collectionGroup('triggers')
      .where('timestamp', '>=', startOfDay)
      .get()

    const rawTriggers: TriggerWithMeta[] = triggersSnap.docs.map((doc) => {
      const data = doc.data()
      return {
        symbol: data.symbol,
        scanId: data.scanId,
        timeframe: data.timeframe,
        timestamp: data.timestamp,
        hit: !!data.hit,
        rrHit: !!data.rrHit,
        timeToTarget: data.timeToTarget ?? -1,
        volumeSpike: !!data.volumeSpike,
        continuation: data.continuation ?? 0,
        moveScore: data.moveScore ?? 0,
        falseSignal: !!data.falseSignal,
        pvsScore: data.pvsScore ?? 0,
      }
    })

    const topRaw = selectTopHighlights(rawTriggers, {
      minPVS: 65,
      limit: 10,
      includeReason: true,
    })

    const enrichedHighlights = topRaw.map((trigger) => {
      const scan = presetScans.find((s) => s.id === trigger.scanId)
      return {
        ...trigger,
        scanName: scan?.name ?? 'Unknown',
        direction: scan?.direction ?? 'bullish',
        confidenceScore: scan?.confidenceScore ?? trigger.pvsScore,
      }
    })

    const today = new Date().toISOString().slice(0, 10)
    const highlightRef = firestore
      .collection('market')
      .doc('highlights')
      .collection('daily')
      .doc(today)

    await highlightRef.set({
      topTriggers: enrichedHighlights,
      updatedAt: Timestamp.now(),
    })

    console.log(`✅ Daily highlights saved: ${enrichedHighlights.length} top scans`)
  } catch (err) {
    console.error('❌ Error generating highlights:', err)
  }
})
